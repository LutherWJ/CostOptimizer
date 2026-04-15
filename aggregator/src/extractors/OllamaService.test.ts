import { describe, it, expect } from "bun:test";
import { OllamaService } from "./OllamaService";

describe("OllamaService Integration", () => {
  // Increase timeout for LLM inference
  const FETCH_TIMEOUT = 60000;
  
  const getService = (model?: string) => {
    return new OllamaService(null, model || process.env.OLLAMA_MODEL || "llama3");
  };
  
  it("should extract hardware details from a messy title", async () => {
    const service = getService(); // Uses env default
    
    console.log(`Testing Ollama Extraction with title: "${messyTitle}"`);
    const result = await service.extractProductDetails(messyTitle);
    
    console.log("Ollama Extraction Result:", result);
    
    expect(result).toBeDefined();
    if (result) {
        expect(result.brand?.toLowerCase()).toContain("dell");
        expect(result.line?.toLowerCase()).toContain("xps");
        expect(result.sku).toContain("9315");
    }
  }, FETCH_TIMEOUT);

  it("should return null gracefully if the model doesn't exist or fails", async () => {
    const service = getService("non-existent-model-12345");
    const result = await service.extractProductDetails("Test Title");
    expect(result).toBeNull();
  }, FETCH_TIMEOUT);
});
