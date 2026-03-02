import { EbayFilters, EbaySearchResponse } from "../types";

export interface IEbayService {
  search(q: string): Promise<EbaySearchResponse>;
  searchWithFilters(filters: EbayFilters): Promise<EbaySearchResponse>;
}
