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
      maxConcurrency: 1, // Be gentle
      useSessionPool: true,
      persistCookiesPerSession: true,
      preNavigationHooks: [
        (_context, gotOptions) => {
          gotOptions.http2 = false;
          gotOptions.headers = {
            ...gotOptions.headers,
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "accept-encoding": "gzip, deflate, br",
            "referer": "https://www.google.com/",
            "dnt": "1",
            "upgrade-insecure-requests": "1",
            "sec-ch-ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "cross-site",
            "sec-fetch-user": "?1",
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
