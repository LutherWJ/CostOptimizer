import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ProductMatcher } from "./ProductMatcher";
import { AliasRepository } from "../repositories/AliasRepository";
import { OllamaService } from "../extractors/OllamaService";
import { db } from "../repositories/connection";

// Mock the db and repositories
mock.module("../repositories/connection", () => ({
  db: mock(() => [])
}));

describe("ProductMatcher", () => {
  let mockAliasRepo: AliasRepository;
  let mockOllamaService: OllamaService;
  let matcher: ProductMatcher;

  beforeEach(() => {
    mockAliasRepo = {
      findAlias: mock(async () => null),
      saveAlias: mock(async () => "alias-id"),
    } as any;

    mockOllamaService = {
      extractProductDetails: mock(async () => null),
    } as any;

    matcher = new ProductMatcher(mockAliasRepo, mockOllamaService, 0.85);
  });

  it("should return cached SKU ID if available (Tier 1)", async () => {
    (mockAliasRepo.findAlias as any).mockImplementation(async () => ({
      sku_id: "cached-sku-id",
    }));

    const result = await matcher.match("Some Random Title");
    
    expect(result).toBe("cached-sku-id");
    expect(mockAliasRepo.findAlias).toHaveBeenCalledWith("Some Random Title");
  });

  it("should use fuzzy matching if not in cache (Tier 2)", async () => {
    // Mock db call for fuzzy search
    const mockDb = (db as any);
    mockDb.mockImplementation(async () => [
      { id: "fuzzy-sku-id", score: "0.90" }
    ]);

    const result = await matcher.match("Dell XPS 13 9315");
    
    expect(result).toBe("fuzzy-sku-id");
    expect(mockAliasRepo.saveAlias).toHaveBeenCalledWith("fuzzy-sku-id", "Dell XPS 13 9315", 0.9);
  });

  it("should fall back to LLM if fuzzy match is below threshold (Tier 3)", async () => {
    const mockDb = (db as any);
    // Tier 2 fails (low score)
    mockDb.mockImplementationOnce(async () => [
      { id: "bad-match-id", score: "0.40" }
    ]);
    
    // Tier 3: LLM extracts SKU
    (mockOllamaService.extractProductDetails as any).mockImplementation(async () => ({
      brand: "Apple",
      line: "MacBook Air",
      sku: "A2337"
    }));

    // Tier 3: DB lookup for the extracted SKU succeeds
    mockDb.mockImplementationOnce(async () => [
      { id: "llm-sku-id", sku_number: "A2337" }
    ]);

    const result = await matcher.match("MacBook Air M1 2020");
    
    expect(result).toBe("llm-sku-id");
    expect(mockOllamaService.extractProductDetails).toHaveBeenCalled();
    expect(mockAliasRepo.saveAlias).toHaveBeenCalledWith("llm-sku-id", "MacBook Air M1 2020", 0.99);
  });

  it("should return null if all tiers fail", async () => {
    const mockDb = (db as any);
    mockDb.mockImplementation(async () => []); // Fuzzy fails
    (mockOllamaService.extractProductDetails as any).mockImplementation(async () => null); // LLM fails

    const result = await matcher.match("Totally Unknown Product 123");
    
    expect(result).toBeNull();
  });
});
