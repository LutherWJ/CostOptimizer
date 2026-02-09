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
