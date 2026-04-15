import type { HardwareSpecs } from "./models/hardwareSpecsSchema";

// --- eBay Types ---

export interface EbayFilters {
  q?: string;
  categoryIds?: string;
  filter?: string; // eBay's filter syntax: e.g., "price:[100..200],conditionIds:{1000|1500}"
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface EbaySearchResponse {
  href: string;
  total: number;
  next?: string;
  limit: number;
  offset: number;
  itemSummaries?: EbayItemSummary[];
  warnings?: any[];
}

export interface EbayItemSummary {
  itemId: string;
  title: string;
  price: {
    value: string;
    currency: string;
  };
  condition?: string;
  conditionId?: string;
  itemWebUrl: string;
  image?: {
    imageUrl: string;
  };
  categories?: {
    categoryId: string;
    categoryName: string;
  }[];
}

export interface PriceResult {
  vendor: string;
  price_usd: number;
  purchase_url: string;
  is_refurbished: boolean;
}

export interface IPriceProvider {
  vendorName: string;
  getLatestPrice(brand: string, sku: string): Promise<PriceResult | null>;
}

export interface IEbayService extends IPriceProvider {
  search(q: string): Promise<EbaySearchResponse>;
  searchWithFilters(filters: EbayFilters): Promise<EbaySearchResponse>;
}

// --- Icecat Types ---

export interface IcecatProductResponse {
  data: {
    GeneralInfo: {
      Brand: string;
      ProductName: string;
      ModelName: string;
    };
    FeaturesGroups: Array<{
      FeatureGroup: {
        Name: {
          Value: string;
        };
      };
      Features: Array<{
        Feature: {
          Name: {
            Value: string;
          };
          Measure?: {
            Sign: string;
          };
        };
        PresentationValue: string;
        RawValue: string | number;
      }>;
    }>;
  };
}

export interface IcecatIndexItem {
  icecatId: string;
  brand: string;
  sku: string;
  ean?: string;
}

export interface IIcecatService {
  getProductSpecs(brand: string, sku: string, icecatId?: string): Promise<HardwareSpecs | null>;
  getRawProductData(brand: string, sku: string, icecatId?: string): Promise<IcecatProductResponse | null>;
  getDiscoveryIndex(sinceDate: Date, limit?: number): Promise<IcecatIndexItem[]>;
}

// --- Benchmark Types ---

export interface BenchmarkResult {
  name: string;
  type: "CPU" | "GPU";
  score: number;
  rank?: number;
  extra_data?: any;
}

export interface IBenchmarkProvider {
  name: string;
  getBenchmarks(): Promise<BenchmarkResult[]>;
}
