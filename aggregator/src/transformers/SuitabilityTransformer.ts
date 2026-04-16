import { LaptopSkuWithBenchmarks } from "../repositories/LaptopSkuRepository";
import { WorkloadRequirement } from "../config/workloads";

export class SuitabilityTransformer {
  /**
   * Evaluates if a specific SKU is suitable for a given workload definition.
   * This is the core business logic for the suitability mapping.
   */
  isSuitable(sku: LaptopSkuWithBenchmarks, workload: WorkloadRequirement): boolean {
    const specs = sku.hardware_specs;
    const min = workload.min_specs;

    // RAM check
    if (specs.ram_gb < min.ram_gb) return false;

    // Storage check
    if (min.storage_gb && specs.storage_gb < min.storage_gb) return false;

    // CPU Cores check
    if (min.cpu_cores && (specs.cpu_cores || 0) < min.cpu_cores) return false;

    // GPU Type check — "integrated" means any GPU is fine; "discrete" requires dedicated GPU
    if (min.gpu_type === "discrete" && specs.gpu_type !== "discrete") return false;

    // VRAM check
    if (min.vram_gb && (specs.gpu_vram_gb || 0) < min.vram_gb) return false;

    // CPU Benchmark check
    if (min.min_cpu_score && (sku.cpu_benchmark_score || 0) < min.min_cpu_score) return false;

    // GPU Benchmark check
    if (min.min_gpu_score && (sku.gpu_benchmark_score || 0) < min.min_gpu_score) return false;

    // OS check — inferred from manufacturer (Apple = macOS, everything else = Windows)
    if (min.os_requirement === "win" && sku.manufacturer === "Apple") return false;
    if (min.os_requirement === "mac" && sku.manufacturer !== "Apple") return false;

    return true;
  }

  /**
   * Maps a SKU to all suitable workload IDs from a provided list of definitions.
   */
  mapSuitableWorkloads(
    sku: LaptopSkuWithBenchmarks, 
    workloads: readonly WorkloadRequirement[],
    workloadIdMap: Map<string, string>
  ): string[] {
    const suitableIds: string[] = [];
    
    for (const def of workloads) {
      if (this.isSuitable(sku, def)) {
        const id = workloadIdMap.get(def.name);
        if (id) suitableIds.push(id);
      }
    }
    
    return suitableIds;
  }
}
