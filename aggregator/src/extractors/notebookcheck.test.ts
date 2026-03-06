import { describe, it, expect } from "bun:test";
import { NotebookcheckExtractor } from "./notebookcheck";
import * as cheerio from "cheerio";

describe("NotebookcheckExtractor Integration Test", () => {
  // These tests fetch large pages, so we increase the timeout.
  const FETCH_TIMEOUT = 30000; 

  it("should fetch real GPU data and parse it successfully", async () => {
    const url = "https://www.notebookcheck.net/Mobile-Graphics-Cards-Benchmark-List.844.0.html";
    
    console.log(`Fetching real data from ${url}...`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Using our static helper to parse the live HTML
    const benchmarks = NotebookcheckExtractor.extractFromTable($, "GPU");

    console.log(`Successfully parsed ${benchmarks.length} GPUs from live site.`);

    expect(benchmarks.length).toBeGreaterThan(100); // Should be hundreds of GPUs
    
    // Check first entry
    const sample = benchmarks[0];
    expect(sample.name).toBeDefined();
    expect(sample.score).toBeGreaterThan(0);
    expect(sample.type).toBe("GPU");
    
    console.log(`Sample GPU: ${sample.name} (Score: ${sample.score}%)`);
  }, FETCH_TIMEOUT);

  it("should fetch real CPU data and parse it successfully", async () => {
    const url = "https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html";
    
    console.log(`Fetching real data from ${url}...`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    const benchmarks = NotebookcheckExtractor.extractFromTable($, "CPU");

    console.log(`Successfully parsed ${benchmarks.length} CPUs from live site.`);

    expect(benchmarks.length).toBeGreaterThan(100);
    
    const sample = benchmarks[0];
    expect(sample.name).toBeDefined();
    expect(sample.score).toBeGreaterThan(0);
    expect(sample.type).toBe("CPU");

    console.log(`Sample CPU: ${sample.name} (Score: ${sample.score}%)`);
  }, FETCH_TIMEOUT);
});
