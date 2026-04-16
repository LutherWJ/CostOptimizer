import { ComponentBenchmarkRepository } from "../repositories/ComponentBenchmarkRepository";
import { LaptopSkuRepository } from "../repositories/LaptopSkuRepository";
import { OllamaService } from "../extractors/OllamaService";
import { logger } from "../utils/logger";

export class AliasSyncJob {
  constructor(
    private skuRepo: LaptopSkuRepository,
    private benchmarkRepo: ComponentBenchmarkRepository,
    private ollama: OllamaService
  ) {}

  async run() {
    logger.info("Starting Component Alias Sync (LLM-powered)...");

    // 1. Get all unique CPUs and GPUs from the database
    const skus = await this.skuRepo.findAllActive();
    const uniqueCpus = new Set(skus.map(s => s.hardware_specs.cpu_family));
    const uniqueGpus = new Set(skus.map(s => s.hardware_specs.gpu_model).filter(Boolean));

    logger.info(`Found ${uniqueCpus.size} unique CPUs and ${uniqueGpus.size} unique GPUs to verify.`);

    // 2. Map CPUs
    for (const cpu of uniqueCpus) {
      await this.resolveAlias(cpu, "CPU");
    }

    // 3. Map GPUs
    for (const gpu of uniqueGpus) {
      if (gpu) await this.resolveAlias(gpu, "GPU");
    }

    logger.info("Alias Sync Job Finished.");
  }

  private async resolveAlias(rawName: string, type: "CPU" | "GPU") {
    // Check if we already have a benchmark match
    const existing = await this.benchmarkRepo.findByName(rawName);
    if (existing) return; // Already mapped!

    // If not, ask the LLM to find the best match from our actual benchmark table
    // First, get a few potential candidates using fuzzy search
    const candidates = await this.benchmarkRepo.fuzzyFind(rawName, 0.2);
    if (candidates.length === 0) return;

    const candidateNames = candidates.map(c => c.component_name);
    
    const prompt = `You are a computer hardware expert. I have a raw hardware string from a manufacturer: "${rawName}"
We need to map this to the closest canonical name in our benchmark database.

CANDIDATES:
${candidateNames.map((name, i) => `${i + 1}. ${name}`).join("\n")}

Respond with ONLY the number of the best match. If none of the candidates are a good match (meaning they are a different model entirely), respond with "0".

Best Match Number:`;

    try {
      const response = await this.ollama.generate(prompt);
      if (!response) return;

      const matchIndex = parseInt(response.trim());
      if (isNaN(matchIndex) || matchIndex === 0 || matchIndex > candidates.length) {
        return; // No confident match
      }

      const bestMatch = candidates[matchIndex - 1];
      logger.info(`[Alias] Mapped "${rawName}" -> "${bestMatch.component_name}" (LLM Match)`);
      
      await this.benchmarkRepo.createAlias(rawName, bestMatch.component_name);
    } catch (e) {
      logger.error(`Failed to resolve alias for ${rawName}:`, e);
    }
  }
}
