import { CheerioCrawler } from "crawlee";
import type { IBenchmarkProvider, BenchmarkResult } from "../types";
import type { CheerioAPI } from "cheerio";
import { logger } from "../utils/logger";

/**
 * NotebookcheckExtractor handles scraping the massive benchmark tables 
 * for both CPUs and GPUs.
 */
export class NotebookcheckExtractor implements IBenchmarkProvider {
  public name = "Notebookcheck";

  /**
   * Main entry point for the job to request benchmarks.
   */
  async getBenchmarks(): Promise<BenchmarkResult[]> {
    const allResults: BenchmarkResult[] = [];

    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 10,
      requestHandlerTimeoutSecs: 60,
      preNavigationHooks: [
        (_context, gotOptions) => {
          gotOptions.http2 = false;
          gotOptions.headers = {
            ...gotOptions.headers,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          };
        },
      ],
      async requestHandler({ $, request }) {
        const url = request.url;
        logger.info(`Processing ${url}...`);

        const isGPU = url.includes("Graphics-Cards");
        const componentType: "CPU" | "GPU" = isGPU ? "GPU" : "CPU";

        const benchmarks = NotebookcheckExtractor.extractFromTable($, componentType);
        
        // Add source info to extra_data
        benchmarks.forEach(b => {
           if (b.extra_data) b.extra_data.source_url = url;
           else b.extra_data = { source_url: url };
        });

        allResults.push(...benchmarks);
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
