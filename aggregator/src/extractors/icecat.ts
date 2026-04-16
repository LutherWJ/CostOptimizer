import { XMLParser } from "fast-xml-parser";
import type { HardwareSpecs } from "../models/hardwareSpecsSchema";
import type {
  IIcecatService,
  IcecatProductResponse,
  IcecatIndexItem,
} from "../types";
import { logger } from "../utils/logger";

interface FeatureDetail {
  value: string;
  rawValue: string | number;
  unit: string;
}

export class IcecatService implements IIcecatService {
  private apiToken: string;
  private shopName: string;
  private appKey: string;
  private username: string;
  private password: string;
  private baseUrl = "https://live.icecat.biz/api";
  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  constructor() {
    this.apiToken = (process.env.ICECAT_ACCESS_TOKEN || "").trim();
    this.shopName = (
      process.env.ICECAT_SHOP_NAME ||
      process.env.ICECAT_USER ||
      ""
    ).trim();
    this.appKey = (process.env.ICECAT_APP_KEY || "").trim();
    this.username = (process.env.ICECAT_USER || "").trim();
    this.password = (process.env.ICECAT_PASSWORD || "").trim();

    if (!this.apiToken) {
      logger.warn("ICECAT_ACCESS_TOKEN not found in environment variables.");
    }
  }

  async getDiscoveryIndex(
    sinceDate: Date,
    limit?: number,
  ): Promise<IcecatIndexItem[]> {
    const indexUrl = `https://data.icecat.biz/export/freexml.int/INT/files.index.xml.gz`;

    if (!this.username || !this.password) {
      throw new Error("CRITICAL: ICECAT_USER or ICECAT_PASSWORD is not set.");
    }

    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString(
        "base64",
      );
      logger.info(
        `Downloading and parsing Full Icecat Index (Since: ${sinceDate.getFullYear()})...`,
      );

      const response = await fetch(indexUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!response.ok) {
        throw new Error(
          `Icecat Index Fetch Failed: ${response.statusText} (${response.status})`,
        );
      }

      const stream = response.body?.pipeThrough(
        new DecompressionStream("gzip"),
      );
      if (!stream) throw new Error("Failed to initialize decompression stream");

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const items: IcecatIndexItem[] = [];

      const fileTagRegex = /<file\s+([^>]+)\/>/gi;
      let totalTagsProcessed = 0;

      let lastMatchEnd = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let match;
        fileTagRegex.lastIndex = 0;

        while ((match = fileTagRegex.exec(buffer)) !== null) {
          totalTagsProcessed++;
          lastMatchEnd = fileTagRegex.lastIndex;

          const tagString = match[0];

          const parsedTag = this.parser.parse(tagString);
          const fileAttrs = parsedTag.file;

          if (!fileAttrs) continue;

          if (totalTagsProcessed % 250000 === 0) {
            logger.info(`Progress: Searched ${totalTagsProcessed} tags...`);
          }

          // Note: Icecat XML uses Capitalized Attributes (Catid, Prod_ID, etc.)
          const catId = String(
            fileAttrs.Catid || fileAttrs.catid || fileAttrs.category_id || "",
          );
          if (catId !== "151") continue;

          // Check date (YYYYMMDDHHMMSS)
          const updatedStr = String(
            fileAttrs.Updated || fileAttrs.updated || "",
          );
          if (updatedStr) {
            const updatedYear = parseInt(updatedStr.substring(0, 4));
            if (updatedYear < sinceDate.getFullYear()) continue;
          }

          const icecatId = String(
            fileAttrs.Product_ID || fileAttrs.product_id || "",
          );

          // Skip vintage models (Low Icecat IDs) - Modern ones are usually > 90,000,000
          // This avoids the "empty specs" problem with archived products.
          if (parseInt(icecatId) < 90000000) continue;

          const brand = String(
            fileAttrs.Supplier_name || fileAttrs.supplier_name || "",
          ); 
          const sku = String(fileAttrs.Prod_ID || fileAttrs.prod_id || "");

          if (icecatId && sku) {
            items.push({ icecatId, brand, sku });
          }

          if (limit && items.length >= limit) break;
        }

        if (limit && items.length >= limit) break;

        buffer = buffer.slice(lastMatchEnd);
        lastMatchEnd = 0;
        fileTagRegex.lastIndex = 0;
      }

      logger.info(
        `Parsed ${totalTagsProcessed} total tags. Found ${items.length} matching laptops.`,
      );
      return items;
    } catch (error) {
      logger.error("Error fetching Icecat discovery index:", error);
      throw error;
    }
  }

  async getRawProductData(
    brand: string,
    sku: string,
    icecatId?: string,
  ): Promise<IcecatProductResponse | null> {
    const params = new URLSearchParams({ lang: "en", shopname: this.shopName });

    if (icecatId) {
      params.append("icecat_id", icecatId);
    } else {
      params.append("Brand", brand);
      params.append("ProductCode", sku);
    }

    if (this.appKey) {
      params.append("app_key", this.appKey);
    } else if (this.apiToken) {
      params.append("app_key", this.apiToken);
    }

    try {
      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          api_token: this.apiToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const errorBody = await response.text();
        throw new Error(`Icecat Live API Error (ID: ${icecatId || brand + " " + sku}): ${response.status} - ${errorBody}`);
      }

      return (await response.json()) as IcecatProductResponse;
    } catch (error) {
      logger.error(`Failed to fetch from Icecat for ID: ${icecatId || brand + " " + sku}:`, error);
      throw error;
    }
  }

  async getProductSpecs(
    brand: string,
    sku: string,
    icecatId?: string,
  ): Promise<HardwareSpecs | null> {
    const rawData = await this.getRawProductData(brand, sku, icecatId);
    if (!rawData || !rawData.data) return null;
    return this.mapIcecatToHardwareSpecs(rawData);
  }

  private mapIcecatToHardwareSpecs(data: IcecatProductResponse): HardwareSpecs {
    const features = this.flattenFeatures(data);

    let screen_size = this.parseNumeric(features["Display diagonal"]);
    if (features["Display diagonal"]?.unit === "cm" && screen_size) {
      screen_size = screen_size / 2.54;
    } else if (screen_size && screen_size > 25) {
      screen_size = screen_size / 2.54;
    }

    let weight_lbs = undefined;
    const weightVal = this.parseNumeric(features["Weight"]);
    if (weightVal) {
      const unit = features["Weight"]?.unit.toLowerCase();
      if (unit === "g") {
        weight_lbs = weightVal / 453.592;
      } else if (unit === "kg" || weightVal > 100) {
        if (weightVal > 100) {
          weight_lbs = weightVal / 453.592;
        } else {
          weight_lbs = weightVal * 2.20462;
        }
      } else {
        weight_lbs = weightVal * 2.20462;
      }
    }

    const cpuModel = features["Processor model"]?.value;
    const cpuFamily = features["Processor family"]?.value;
    
    // Construct a full CPU name (e.g., "Intel Core i7 1355U" instead of just "1355U")
    let cpuName = cpuModel || cpuFamily || "Unknown";
    if (cpuFamily && cpuModel && !cpuModel.toLowerCase().includes(cpuFamily.toLowerCase())) {
      cpuName = `${cpuFamily} ${cpuModel}`;
    }

    const specs: HardwareSpecs = {
      cpu_family: cpuName.replace(/[™®]/g, "").trim(),
      cpu_cores: this.parseNumeric(features["Processor cores"]),
      ram_gb: this.parseNumeric(features["Internal memory"]) || 0,
      storage_gb: this.parseNumeric(features["Total storage capacity"]) || 0,

      gpu_model: (
        features["Discrete graphics card model"]?.value ||
        features["On-board graphics card model"]?.value ||
        "Integrated"
      ).replace(/[™®]/g, "").trim(),
      gpu_type:
        features["Discrete graphics card model"] &&
        features["Discrete graphics card model"].value !== "Not available"
          ? "discrete"
          : "integrated",
      gpu_vram_gb:
        this.parseNumeric(features["Discrete graphics card memory"]) || 0,

      screen_size_inches: screen_size ? parseFloat(screen_size.toFixed(1)) : 0,
      display_resolution: features["Display resolution"]?.value || "Unknown",
      panel_type: features["Panel type"]?.value,
      nits: this.parseNumeric(features["Display brightness"]),

      battery_wh: this.parseNumeric(features["Battery capacity (Watt-hours)"]),
      weight_lbs: weight_lbs ? parseFloat(weight_lbs.toFixed(2)) : undefined,
    };

    (specs as any)._brandName = data.data.GeneralInfo.Brand;

    return specs;
  }

  private flattenFeatures(
    data: IcecatProductResponse,
  ): Record<string, FeatureDetail> {
    const flattened: Record<string, FeatureDetail> = {};
    if (!data.data.FeaturesGroups) return flattened;

    data.data.FeaturesGroups.forEach((group) => {
      group.Features.forEach((feature) => {
        const key = feature.Feature.Name.Value;
        flattened[key] = {
          value: feature.PresentationValue,
          rawValue: feature.RawValue,
          unit: feature.Feature.Measure?.Sign || "",
        };
      });
    });
    return flattened;
  }

  private parseNumeric(detail?: FeatureDetail): number | undefined {
    if (!detail) return undefined;
    const presentationNum = parseFloat(detail.value);
    const rawNum =
      typeof detail.rawValue === "number"
        ? detail.rawValue
        : parseFloat(detail.rawValue);

    if (detail.value.toLowerCase().includes("tb")) {
      return presentationNum * 1024;
    }

    return isNaN(presentationNum)
      ? isNaN(rawNum)
        ? undefined
        : rawNum
      : presentationNum;
  }
}
