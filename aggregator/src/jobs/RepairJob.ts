import { LaptopSkuRepository, ProductLineRepository } from "../repositories";
import { OllamaService } from "../extractors/OllamaService";
import { logger } from "../utils/logger";

export class RepairJob {
  constructor(
    private skuRepo: LaptopSkuRepository,
    private lineRepo: ProductLineRepository,
    private ollama: OllamaService
  ) {}

  async run() {
    logger.info("Starting Data Quality Repair Job...");

    const skus = await this.skuRepo.findAllActive();
    let repairedBrands = 0;
    let repairedGpus = 0;

    for (const sku of skus) {
      let needsUpdate = false;
      const specs = Object.assign({}, sku.hardware_specs);
      
      // 1. Repair Reseller Brands
      const productLine = await this.lineRepo.findById(sku.product_line_id);
      const currentBrand = productLine?.manufacturer || "";
      const resellers = ["flex it", "upcycle it", "bsi-refurbished", "bsi", "refurbished"];
      
      if (resellers.includes(currentBrand.toLowerCase())) {
        const prompt = `Identify the actual manufacturer (Dell, HP, Lenovo, Apple, ASUS, Acer, Microsoft) from this SKU: "${sku.sku_number}". Respond with ONLY the brand name. If unsure, respond with "Unknown".`;
        const realBrand = await this.ollama.generate(prompt);
        
        if (realBrand && realBrand.trim() !== "Unknown" && realBrand.length < 20 && !realBrand.includes("!")) {
          const cleanBrand = realBrand.trim();
          logger.info(`[Repair] Re-branding SKU ${sku.sku_number}: ${currentBrand} -> ${cleanBrand}`);
          
          // Move to correct product line
          const newLineId = await this.lineRepo.upsert(cleanBrand, cleanBrand);
          sku.product_line_id = newLineId;
          needsUpdate = true;
          repairedBrands++;
        }
      }

      // 2. Repair generic or missing GPUs
      const currentGpu = specs.gpu_model?.toLowerCase() || "";
      if (!currentGpu || currentGpu === "integrated" || currentGpu === "not available") {
        const prompt = `Identify the specific integrated GPU model for this CPU: "${specs.cpu_family}". Respond with ONLY the GPU name (e.g., "Intel Iris Xe Graphics", "AMD Radeon 780M").`;
        const gpuModel = await this.ollama.generate(prompt);
        
        if (gpuModel && gpuModel.length > 5 && gpuModel.length < 50 && !gpuModel.includes("!")) {
          logger.info(`[Repair] Identified GPU for ${specs.cpu_family}: ${gpuModel.trim()}`);
          specs.gpu_model = gpuModel.trim();
          sku.hardware_specs = specs;
          needsUpdate = true;
          repairedGpus++;
        }
      }

      if (needsUpdate) {
        // We use upsert to update the existing record
        await this.skuRepo.upsert(sku.product_line_id, sku.sku_number, specs);
      }
    }

    logger.info(`Repair Job Finished. Brands: ${repairedBrands}, GPUs: ${repairedGpus}`);
  }
}
