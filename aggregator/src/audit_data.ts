import { db } from "./repositories/connection";
import { logger } from "./utils/logger";

async function audit() {
  try {
    console.log("--- Database Quality Audit ---");

    // 1. Manufacturer Spread
    const spread = await db`
      SELECT pl.manufacturer, COUNT(*) as count
      FROM laptop_skus ls
      JOIN product_lines pl ON ls.product_line_id = pl.id
      GROUP BY pl.manufacturer
      ORDER BY count DESC;
    `;
    console.log("\nManufacturer Spread:");
    console.table(spread);

    // 2. Benchmark Coverage
    // This query uses the same join logic as LaptopSkuRepository.findAllWithBenchmarks
    const coverage = await db`
      SELECT 
        COUNT(*) as total_laptops,
        COUNT(cpu.benchmark_score) as laptops_with_cpu_scores,
        COUNT(gpu.benchmark_score) as laptops_with_gpu_scores,
        ROUND(COUNT(cpu.benchmark_score) * 100.0 / COUNT(*), 2) as cpu_coverage_pct,
        ROUND(COUNT(gpu.benchmark_score) * 100.0 / COUNT(*), 2) as gpu_coverage_pct
      FROM laptop_skus ls
      -- Join for CPU
      LEFT JOIN component_aliases ca_cpu ON ca_cpu.alias_name = ls.hardware_specs->>'cpu_family'
      LEFT JOIN component_benchmarks cpu ON cpu.component_name = COALESCE(ca_cpu.canonical_name, ls.hardware_specs->>'cpu_family')
      -- Join for GPU
      LEFT JOIN component_aliases ca_gpu ON ca_gpu.alias_name = ls.hardware_specs->>'gpu_model'
      LEFT JOIN component_benchmarks gpu ON gpu.component_name = COALESCE(ca_gpu.canonical_name, ls.hardware_specs->>'gpu_model');
    `;
    console.log("\nBenchmark Coverage:");
    console.table(coverage);

    // 3. Unmapped Components (The "To-Do" List)
    const unmappedCpus = await db`
      SELECT DISTINCT ls.hardware_specs->>'cpu_family' as cpu_name
      FROM laptop_skus ls
      LEFT JOIN component_aliases ca ON ca.alias_name = ls.hardware_specs->>'cpu_family'
      LEFT JOIN component_benchmarks cb ON cb.component_name = COALESCE(ca.canonical_name, ls.hardware_specs->>'cpu_family')
      WHERE cb.benchmark_score IS NULL
      LIMIT 10;
    `;
    if (unmappedCpus.length > 0) {
      console.log("\nSample of Unmapped CPUs (Missing Benchmarks):");
      console.table(unmappedCpus);
    }

    const unmappedGpus = await db`
      SELECT DISTINCT ls.hardware_specs->>'gpu_model' as gpu_name
      FROM laptop_skus ls
      LEFT JOIN component_aliases ca ON ca.alias_name = ls.hardware_specs->>'gpu_model'
      LEFT JOIN component_benchmarks cb ON cb.component_name = COALESCE(ca.canonical_name, ls.hardware_specs->>'gpu_model')
      WHERE cb.benchmark_score IS NULL AND ls.hardware_specs->>'gpu_model' IS NOT NULL
      LIMIT 10;
    `;
    if (unmappedGpus.length > 0) {
      console.log("\nSample of Unmapped GPUs (Missing Benchmarks):");
      console.table(unmappedGpus);
    }

  } catch (err: any) {
    console.error("Audit failed:", err.message);
  } finally {
    process.exit(0);
  }
}

audit();
