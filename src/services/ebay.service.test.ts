import { EbayService } from "./ebay.service";

async function testEbayService() {
  const ebayService = new EbayService();
  try {
    console.log("Testing eBay search...");
    const results = await ebayService.search("laptop");
    console.log("Search successful:", results.total);

    console.log("Testing eBay search with filters...");
    const filteredResults = await ebayService.searchWithFilters({
      q: "iPhone",
      filter: "price:[500..1000],conditionIds:{1000}",
      limit: 5
    });
    console.log("Filtered search successful:", filteredResults.itemSummaries?.length);
  } catch (error) {
    console.error("Search failed as expected without real credentials:", (error as Error).message);
  }
}

testEbayService();
