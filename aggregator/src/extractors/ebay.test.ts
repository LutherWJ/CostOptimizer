import { EbayService } from "./ebay.service";

async function testEbayService() {
  const ebayService = new EbayService();
  try {
    const productSearch = "MacBook Pro 16 MRW13LL/A";
    console.log(`Testing eBay search for: ${productSearch}`);
    const results = await ebayService.search(productSearch);
    console.log("Search successful:", results.total);

    console.log("Testing eBay search with filters...");
    const filteredResults = await ebayService.searchWithFilters({
      q: productSearch,
      filter: "price:[500..5000],priceCurrency:USD,conditionIds:{1000}",
      limit: 5,
    });
    console.log(
      "Filtered search successful:",
      filteredResults.itemSummaries?.length || 0,
    );
  } catch (error) {
    console.error(
      "Search failed:",
      (error as Error).message,
    );
  }
}

testEbayService();
