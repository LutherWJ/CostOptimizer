import type { EbayFilters, EbaySearchResponse, IEbayService } from "../types";

export class EbayService implements IEbayService {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  public vendorName = "eBay";

  constructor() {
    this.clientId = (process.env.EBAY_CLIENT_ID || "").trim();
    this.clientSecret = (process.env.EBAY_CLIENT_SECRET || "").trim();

    const isSandbox =
      process.env.EBAY_ENVIRONMENT === "sandbox" ||
      this.clientId.includes("-SBX-");
    this.baseUrl = isSandbox
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";

    if (!this.clientId || !this.clientSecret) {
      console.warn("eBay credentials not found in environment variables.");
    }
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64",
    );
    const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get eBay access token: ${error}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  async search(q: string): Promise<EbaySearchResponse> {
    return this.searchWithFilters({ q });
  }

  async searchWithFilters(filters: EbayFilters): Promise<EbaySearchResponse> {
    const token = await this.getAccessToken();
    const params = new URLSearchParams();

    if (filters.q) params.append("q", filters.q);
    if (filters.categoryIds) params.append("category_ids", filters.categoryIds);
    if (filters.filter) params.append("filter", filters.filter);
    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.offset) params.append("offset", filters.offset.toString());
    if (filters.sort) params.append("sort", filters.sort);

    const response = await fetch(
      `${this.baseUrl}/buy/browse/v1/item_summary/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`eBay search failed: ${error}`);
    }

    const json = await response.json();
    console.log("eBay API Raw Response:", JSON.stringify(json, null, 2));

    if (json.warnings) {
      console.warn("eBay API Warnings:", json.warnings);
    }

    return json as EbaySearchResponse;
  }

  /**
   * Finds the best price for a specific SKU on eBay.
   */
  async getLatestPrice(
    brand: string,
    sku: string,
  ): Promise<import("../types").PriceResult | null> {
    try {
      const results = await this.search(`${brand} ${sku}`);

      if (!results.itemSummaries || results.itemSummaries.length === 0) {
        return null;
      }

      // 1. Basic relevance check: Ensure title contains the SKU 
      // 2. Avoid accessories: Must be in a laptop/notebook category
      const validLaptops = results.itemSummaries.filter((item) => {
        const title = item.title.toLowerCase();
        const cats = item.categories?.map((c) => c.categoryName.toLowerCase()) || [];
        const matchesSku = title.includes(sku.toLowerCase());
        const isLaptopCat = cats.some((c) => c.includes("laptop") || c.includes("notebook"));
        
        return matchesSku && isLaptopCat;
      });

      if (validLaptops.length === 0) return null;

      // eBay search results are generally sorted by relevance, 
      // but we want the lowest price among the relevant ones.
      const sorted = validLaptops.sort(
        (a, b) => parseFloat(a.price.value) - parseFloat(b.price.value),
      );

      const bestDeal = sorted[0]!;

      return {
        vendor: this.vendorName,
        price_usd: parseFloat(bestDeal.price.value),
        purchase_url: bestDeal.itemWebUrl,
        // Condition ID 1000 = "New", 1500 = "New other", 2000 = "Certified Refurbished"
        is_refurbished: bestDeal.conditionId !== "1000",
      };
    } catch (err) {
      console.error(`eBay price fetch failed for ${brand} ${sku}:`, err);
      return null;
    }
  }
}
