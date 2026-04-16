import { describe, it, expect } from "bun:test";
import { NotebookcheckExtractor } from "./notebookcheck";
import * as cheerio from "cheerio";

describe("NotebookcheckExtractor Unit Test", () => {
  const mockGpuHtml = `
    <table class="sortable">
      <tr class="header"><th>Pos</th><th>Model</th><th>Value</th></tr>
      <tr>
        <td class="poslabel"><span class="gg_pos">1</span></td>
        <td><a href="#">NVIDIA GeForce RTX 4090 Laptop GPU</a></td>
        <td class="value bv_perfrating"><span class="bl_ch_value">100%</span></td>
      </tr>
      <tr>
        <td class="poslabel"><span class="gg_pos">2</span></td>
        <td><a href="#">NVIDIA GeForce RTX 4080 Laptop GPU</a></td>
        <td class="value bv_perfrating"><span class="bl_ch_value">90%</span></td>
      </tr>
    </table>
  `;

  const mockCpuHtml = `
    <table class="sortable">
      <tr class="header"><th>Pos</th><th>Model</th><th>Value</th></tr>
      <tr>
        <td class="poslabel"><span class="gg_pos">1</span></td>
        <td><a href="#">Intel Core i9-13980HX</a></td>
        <td class="value bv_perfrating"><span class="bl_ch_value">100%</span></td>
      </tr>
    </table>
  `;

  it("should parse GPU data from HTML successfully", async () => {
    const $ = cheerio.load(mockGpuHtml);
    const benchmarks = NotebookcheckExtractor.extractFromTable($, "GPU");

    expect(benchmarks.length).toBe(2);
    expect(benchmarks[0].name).toBe("NVIDIA GeForce RTX 4090 Laptop GPU");
    expect(benchmarks[0].score).toBe(100);
    expect(benchmarks[1].score).toBe(90);
  });

  it("should parse CPU data from HTML successfully", async () => {
    const $ = cheerio.load(mockCpuHtml);
    const benchmarks = NotebookcheckExtractor.extractFromTable($, "CPU");

    expect(benchmarks.length).toBe(1);
    expect(benchmarks[0].name).toBe("Intel Core i9-13980HX");
    expect(benchmarks[0].score).toBe(100);
  });
});
