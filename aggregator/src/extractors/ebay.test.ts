import { describe, it, expect } from "bun:test";
import { EbayService } from "./ebay";

describe("EbayService Integration", () => {
  const service = new EbayService();
  const hasCredentials = !!process.env.EBAY_CLIENT_ID && !!process.env.EBAY_CLIENT_SECRET;

  if (!hasCredentials) {
    console.warn("Skipping eBay Integration tests: EBAY_CLIENT_ID or EBAY_CLIENT_SECRET not set.");
  }

  it("should search for a product on eBay", async () => {
    if (!hasCredentials) return;

    const productSearch = "MacBook Pro 16 MRW13LL/A";
    console.log(`Testing eBay search for: ${productSearch}`);
    const results = await service.search(productSearch);
    
    expect(results).toBeDefined();
    expect(results.total).toBeGreaterThan(0);
    console.log("Search successful, total results:", results.total);
  });

  it("should search with filters", async () => {
    if (!hasCredentials) return;

    const results = await service.searchWithFilters({
      q: "MacBook Pro",
      limit: 5,
    });
    
    expect(results.itemSummaries).toBeDefined();
    expect(results.itemSummaries?.length).toBeLessThanOrEqual(5);
  });
});
