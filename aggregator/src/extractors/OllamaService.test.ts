import { describe, it, expect } from "bun:test";
import { OllamaService } from "./OllamaService";

describe("OllamaService Integration", () => {
  // Increase timeout for LLM inference (it can take time to load the model on first request)
  const FETCH_TIMEOUT = 60000;
  
  it("should extract hardware details from a messy title", async () => {
    // We expect the Ollama server to be running locally via docker-compose on port 11434
    const service = new OllamaService("http://localhost:11434", "tinydolphin");
    
    const messyTitle = "Dell XPS 13 9315 13.4\" FHD+ Laptop Core i7-1250U 16GB 512GB SSD Windows 11";
    
    console.log(`Testing Ollama Extraction with title: "${messyTitle}"`);
    const result = await service.extractProductDetails(messyTitle);
    
    console.log("Ollama Extraction Result:", result);
    
    expect(result).toBeDefined();
    expect(result?.brand?.toLowerCase()).toContain("dell");
    expect(result?.line?.toLowerCase()).toContain("xps");
    expect(result?.sku).toContain("9315");
  }, FETCH_TIMEOUT);

  it("should return null gracefully if the model doesn't exist or fails", async () => {
    const service = new OllamaService("http://localhost:11434", "non-existent-model-12345");
    const result = await service.extractProductDetails("Test Title");
    expect(result).toBeNull();
  }, FETCH_TIMEOUT);
});
