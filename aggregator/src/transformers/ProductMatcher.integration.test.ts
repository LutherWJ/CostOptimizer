import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { ProductMatcher } from "./ProductMatcher";
import { AliasRepository } from "../repositories/AliasRepository";
import { OllamaService } from "../extractors/OllamaService";
import { LaptopSkuRepository } from "../repositories/LaptopSkuRepository";
import { ProductLineRepository } from "../repositories/ProductLineRepository";
import { db } from "../repositories/connection";

describe("ProductMatcher End-to-End Integration", () => {
  const FETCH_TIMEOUT = 60000;
  
  const aliasRepo = new AliasRepository();
  const skuRepo = new LaptopSkuRepository();
  const lineRepo = new ProductLineRepository();
  const ollamaService = new OllamaService(); // Uses env OLLAMA_MODEL
  const matcher = new ProductMatcher(aliasRepo, ollamaService, 0.85);

  const testMessyTitle = "INTEGRATION_TEST_MESSY_TITLE_LENOVO_LEGION_5_PRO_16_INCH";
  const expectedSku = "INTEGRATION-LEGION-5-PRO-16";
  let insertedSkuId: string;

  beforeAll(async () => {
    // 0. Ensure schema is initialized
    await aliasRepo.initializeSchema();

    // 1. Clean up any existing test data
    try {
      await db`DELETE FROM sku_aliases WHERE raw_string = ${testMessyTitle}`;
    } catch (e) {
      // Ignore if table didn't exist yet
    }
    await db`DELETE FROM laptop_skus WHERE sku_number = ${expectedSku}`;
    await db`DELETE FROM product_lines WHERE manufacturer = 'INTEGRATION_TEST_LENOVO'`;

    // 2. Insert mock product line and SKU
    const lineId = await lineRepo.upsert("INTEGRATION_TEST_LENOVO", "INTEGRATION_TEST_LEGION");
    if (!lineId) throw new Error("Failed to insert integration test product line");

    insertedSkuId = await skuRepo.upsert(
      lineId, 
      expectedSku, 
      {
        cpu_family: "Intel Core i7",
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "discrete",
        screen_size_inches: 16,
        display_resolution: "2560x1600"
      }
    );
    if (!insertedSkuId) throw new Error("Failed to insert integration test SKU");
  });

  afterAll(async () => {
    // Clean up test data
    await db`DELETE FROM sku_aliases WHERE raw_string = ${testMessyTitle}`;
    await db`DELETE FROM laptop_skus WHERE sku_number = ${expectedSku}`;
    await db`DELETE FROM product_lines WHERE manufacturer = 'INTEGRATION_TEST_LENOVO'`;
  });

  it("should extract SKU via LLM and cache the result (Tier 3)", async () => {
    // The title is very messy and doesn't exactly match our SKU, plus pg_trgm won't hit > 0.85 
    // against our mock sku_number "INTEGRATION-LEGION-5-PRO-16".
    // But we'll feed Ollama a title that explicitly includes the expected SKU string 
    // so it can extract it accurately.
    const titleWithTargetSku = `Brand: LENOVO Line: LEGION SKU: ${expectedSku}`;
    
    console.log(`Testing E2E Matcher with title: "${titleWithTargetSku}"`);
    const startTime = Date.now();
    const matchedSkuId = await matcher.match(titleWithTargetSku);
    const duration = Date.now() - startTime;
    
    console.log(`E2E Match took ${duration}ms`);
    
    expect(matchedSkuId).toBe(insertedSkuId);

    // Verify it was cached in sku_aliases
    const cachedAlias = await aliasRepo.findAlias(titleWithTargetSku);
    expect(cachedAlias).not.toBeNull();
    expect(cachedAlias?.sku_id).toBe(insertedSkuId);
    expect(cachedAlias?.confidence_score).toBe("0.99"); // The confidence score we set in ProductMatcher for LLM match
  }, FETCH_TIMEOUT);

  it("should return the cached result instantly on the second try (Tier 1)", async () => {
    const titleWithTargetSku = `Brand: LENOVO Line: LEGION SKU: ${expectedSku}`;
    
    const startTime = Date.now();
    const matchedSkuId = await matcher.match(titleWithTargetSku);
    const duration = Date.now() - startTime;
    
    console.log(`E2E Cache Hit took ${duration}ms`);
    
    expect(matchedSkuId).toBe(insertedSkuId);
    expect(duration).toBeLessThan(100); // Should be very fast (a single DB query)
  });
});
