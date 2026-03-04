import { HardwareSpecs } from "../models/hardwareSpecsSchema";
import { IIcecatService, IcecatProductResponse, IcecatIndexItem } from "../types";

interface FeatureDetail {
  value: string;
  rawValue: string | number;
  unit: string;
}

export class IcecatService implements IIcecatService {
  private apiToken: string;
  private shopName: string;
  private appKey: string;
  private baseUrl = "https://live.icecat.biz/api";

  constructor() {
    this.apiToken = (process.env.ICECAT_ACCESS_TOKEN || "").trim();
    this.shopName = (process.env.ICECAT_SHOP_NAME || "").trim();
    this.appKey = (process.env.ICECAT_APP_KEY || "").trim();

    if (!this.apiToken) {
      console.warn("Icecat API token not found in environment variables.");
    }
  }

  /**
   * Discovers product SKUs using Icecat's category-specific CSV export.
   * Laptops = Category 151.
   */
  async getDiscoveryIndex(limit: number = 100): Promise<IcecatIndexItem[]> {
    // For Open Icecat, we can use the daily updated CSV for category 151
    const csvUrl = `https://data.icecat.biz/export/freecsv.pkg/en/151.csv`;
    
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch Icecat index: ${response.statusText}`);
      }

      const text = await response.text();
      const lines = text.split("\n");
      const items: IcecatIndexItem[] = [];

      for (let i = 1; i < lines.length && items.length < limit; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        // Icecat CSVs in the free package are often tab or semicolon separated.
        const parts = line.includes("\t") ? line.split("\t") : line.split(";");
        if (parts.length < 3) continue;

        items.push({
          icecatId: parts[0]!.replace(/"/g, ""),
          brand: parts[1]!.replace(/"/g, ""),
          sku: parts[2]!.replace(/"/g, ""),
          ean: parts[3]?.replace(/"/g, ""),
        });
      }

      return items;
    } catch (error) {
      console.error("Error fetching Icecat discovery index:", error);
      return [];
    }
  }

  async getRawProductData(brand: string, sku: string): Promise<IcecatProductResponse | null> {
    const params = new URLSearchParams({
      lang: "en",
      shopname: this.shopName,
      Brand: brand,
      ProductCode: sku,
    });

    if (this.appKey) {
      params.append("app_key", this.appKey);
    } else if (this.apiToken) {
      params.append("app_key", this.apiToken);
    }

    try {
      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          "api_token": this.apiToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const errorBody = await response.text();
        console.error(`Icecat API Error Status: ${response.status}`, errorBody);
        return null;
      }

      return await response.json() as IcecatProductResponse;
    } catch (error) {
      console.error(`Failed to fetch from Icecat for ${brand} ${sku}:`, error);
      return null;
    }
  }

  async getProductSpecs(brand: string, sku: string): Promise<HardwareSpecs | null> {
    const rawData = await this.getRawProductData(brand, sku);
    if (!rawData || !rawData.data) return null;

    return this.mapIcecatToHardwareSpecs(rawData);
  }

  private mapIcecatToHardwareSpecs(data: IcecatProductResponse): HardwareSpecs {
    const features = this.flattenFeatures(data);

    // Parse Display Size
    let screen_size = this.parseNumeric(features["Display diagonal"]);
    if (features["Display diagonal"]?.unit === "cm" && screen_size) {
      screen_size = screen_size / 2.54;
    } else if (screen_size && screen_size > 25) {
      // Fallback: If it's > 25 and no unit, it's almost certainly CM
      screen_size = screen_size / 2.54;
    }

    // Parse Weight (Standardize to LBS)
    let weight_lbs = undefined;
    const weightVal = this.parseNumeric(features["Weight"]);
    if (weightVal) {
      const unit = features["Weight"]?.unit.toLowerCase();
      if (unit === "g") {
        weight_lbs = (weightVal / 453.592);
      } else if (unit === "kg" || (weightVal > 100)) { 
        // If it's labeled kg, or it's > 100 (likely grams unlabeled), handle accordingly
        if (weightVal > 100) { // Assume grams if no unit and high number
           weight_lbs = (weightVal / 453.592);
        } else {
           weight_lbs = (weightVal * 2.20462);
        }
      } else {
        // Default to kg for small numbers
        weight_lbs = (weightVal * 2.20462);
      }
    }

    return {
      cpu_family: features["Processor family"]?.value || features["Processor model"]?.value || "Unknown",
      cpu_cores: this.parseNumeric(features["Processor cores"]),
      ram_gb: this.parseNumeric(features["Internal memory"]),
      storage_gb: this.parseNumeric(features["Total storage capacity"]),
      
      gpu_model: features["Discrete graphics card model"]?.value || features["On-board graphics card model"]?.value,
      gpu_type: (features["Discrete graphics card model"] && features["Discrete graphics card model"].value !== "Not available") 
                 ? "discrete" : "integrated",
      gpu_vram_gb: this.parseNumeric(features["Discrete graphics card memory"]) || 0,

      screen_size_inches: screen_size ? parseFloat(screen_size.toFixed(1)) : 0,
      display_resolution: features["Display resolution"]?.value || "Unknown",
      panel_type: features["Panel type"]?.value,
      nits: this.parseNumeric(features["Display brightness"]),
      
      battery_wh: this.parseNumeric(features["Battery capacity (Watt-hours)"]),
      weight_lbs: weight_lbs ? parseFloat(weight_lbs.toFixed(2)) : undefined,
    };
  }

  private flattenFeatures(data: IcecatProductResponse): Record<string, FeatureDetail> {
    const flattened: Record<string, FeatureDetail> = {};
    data.data.FeaturesGroups.forEach(group => {
      group.Features.forEach(feature => {
        const key = feature.Feature.Name.Value;
        flattened[key] = {
          value: feature.PresentationValue,
          // Use RawValue but fallback to parsing PresentationValue if RawValue is misleading (like 1 for 1TB)
          rawValue: feature.RawValue,
          unit: feature.Feature.Measure?.Sign || "",
        };
      });
    });
    return flattened;
  }

  private parseNumeric(detail?: FeatureDetail): number | undefined {
    if (!detail) return undefined;
    
    // If rawValue is 1 but presentation says 1000 or 512, rawValue is likely in TB/GB mixed.
    // We prefer the number from PresentationValue for consistency in these cases.
    const presentationNum = parseFloat(detail.value);
    const rawNum = typeof detail.rawValue === "number" ? detail.rawValue : parseFloat(detail.rawValue);

    if (detail.value.toLowerCase().includes("tb")) {
      return presentationNum * 1024;
    }

    return isNaN(presentationNum) ? (isNaN(rawNum) ? undefined : rawNum) : presentationNum;
  }
}
