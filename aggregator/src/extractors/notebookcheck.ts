import { PlaywrightCrawler } from "crawlee";
import type { IBenchmarkProvider, BenchmarkResult } from "../types";
import type { CheerioAPI } from "cheerio";
import { logger } from "../utils/logger";

/**
 * NotebookcheckExtractor handles scraping the massive benchmark tables 
 * for both CPUs and GPUs using Playwright to bypass blocks.
 */
export class NotebookcheckExtractor implements IBenchmarkProvider {
  public name = "Notebookcheck";

  /**
   * Main entry point for the job to request benchmarks.
   */
  async getBenchmarks(): Promise<BenchmarkResult[]> {
    const allResults: BenchmarkResult[] = [];

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 10,
      requestHandlerTimeoutSecs: 60,
      maxConcurrency: 1, // Be gentle
      launchContext: {
        launchOptions: {
          headless: true,
        },
      },
      async requestHandler({ page, request, parseWithCheerio }) {
        const url = request.url;
        logger.info(`Processing ${url} with Playwright...`);

        // Wait for the table to be rendered by JS
        try {
          await page.waitForSelector("table.sortable", { timeout: 30000 });
        } catch (e) {
          logger.error(`Timeout waiting for table on ${url}. Page might not have loaded correctly.`);
          return;
        }

        const isGPU = url.includes("Graphics-Cards");
        const componentType: "CPU" | "GPU" = isGPU ? "GPU" : "CPU";

        // Use Crawlee's helper to get a Cheerio instance of the rendered page
        const $ = await parseWithCheerio();
        const benchmarks = NotebookcheckExtractor.extractFromTable($, componentType);
        
        // Add source info to extra_data
        benchmarks.forEach(b => {
           if (b.extra_data) b.extra_data.source_url = url;
           else b.extra_data = { source_url: url };
        });

        logger.info(`Successfully extracted ${benchmarks.length} ${componentType} benchmarks from ${url}`);
        for (const b of benchmarks) {
          allResults.push(b);
        }
      },
    });

    await crawler.run([
      "https://www.notebookcheck.net/Mobile-Graphics-Cards-Benchmark-List.844.0.html",
      "https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html"
    ]);

    return allResults;
  }

  /**
   * Static helper to parse a Notebookcheck benchmark table using Cheerio.
   */
  static extractFromTable($: CheerioAPI, componentType: "CPU" | "GPU"): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];
    const table = $("table.sortable").first();
    const rows = table.find("tr:not(.extra):not(.header)");

    rows.each((_, element) => {
      const row = $(element);
      
      const nameLink = row.find("td:not(.poslabel) a").first();
      const name = nameLink.text().trim();
      
      const rankText = row.find("td.poslabel span.gg_pos").text().trim();
      const rank = parseInt(rankText, 10);

      const perfCell = row.find("td.value.bv_perfrating span.bl_ch_value").first();
      let perfValue = perfCell.find("span").length > 0 
        ? perfCell.find("span").first().text().trim() 
        : perfCell.text().trim();
      
      // Clean up perfValue: remove ~, %, and commas
      perfValue = perfValue.replace(/[~%,]/g, "");
      const perfScore = parseFloat(perfValue);

      if (name && !isNaN(perfScore)) {
        results.push({
          name,
          type: componentType,
          score: Math.round(perfScore),
          rank: isNaN(rank) ? undefined : rank,
          extra_data: {
             notebookcheck_rank: isNaN(rank) ? undefined : rank
          }
        });
      }
    });

    return results;
  }
}
