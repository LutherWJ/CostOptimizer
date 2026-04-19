import { db } from "./connection";

export class AuditRepository {
  async getManufacturerSpread() {
    return await db`
      SELECT pl.manufacturer, COUNT(*) as count
      FROM laptop_skus ls
      JOIN product_lines pl ON ls.product_line_id = pl.id
      GROUP BY pl.manufacturer
      ORDER BY count DESC;
    `;
  }

  async getBenchmarkCoverage() {
    return await db`
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
  }

  async getUnmappedCpus(limit = 10) {
    return await db`
      SELECT DISTINCT ls.hardware_specs->>'cpu_family' as cpu_name
      FROM laptop_skus ls
      LEFT JOIN component_aliases ca ON ca.alias_name = ls.hardware_specs->>'cpu_family'
      LEFT JOIN component_benchmarks cb ON cb.component_name = COALESCE(ca.canonical_name, ls.hardware_specs->>'cpu_family')
      WHERE cb.benchmark_score IS NULL
      LIMIT ${limit};
    `;
  }

  async getUnmappedGpus(limit = 10) {
    return await db`
      SELECT DISTINCT ls.hardware_specs->>'gpu_model' as gpu_name
      FROM laptop_skus ls
      LEFT JOIN component_aliases ca ON ca.alias_name = ls.hardware_specs->>'gpu_model'
      LEFT JOIN component_benchmarks cb ON cb.component_name = COALESCE(ca.canonical_name, ls.hardware_specs->>'gpu_model')
      WHERE cb.benchmark_score IS NULL AND ls.hardware_specs->>'gpu_model' IS NOT NULL
      LIMIT ${limit};
    `;
  }

  async getPricingCoverage() {
    return await db`
      SELECT 
        COUNT(*) as total_active_skus,
        COUNT(DISTINCT ph.laptop_sku_id) as skus_with_prices,
        ROUND(COUNT(DISTINCT ph.laptop_sku_id) * 100.0 / NULLIF(COUNT(*), 0), 2) as price_coverage_pct
      FROM laptop_skus ls
      LEFT JOIN price_history ph ON ls.id = ph.laptop_sku_id
      WHERE ls.is_active = TRUE;
    `;
  }

  async getSuitabilityCoverage() {
    return await db`
      SELECT 
        wr.workload_name,
        COUNT(ss.sku_id) as laptop_count
      FROM workload_requirements wr
      LEFT JOIN sku_suitability ss ON wr.id = ss.workload_id
      GROUP BY wr.workload_name
      ORDER BY laptop_count DESC;
    `;
  }

  async getMaterializedViewStatus() {
    return await db`
      SELECT COUNT(*) as recommendation_count
      FROM laptop_recommendations;
    `;
  }

  async getPipelineFailures() {
    return await db`
      SELECT 
        ls.sku_number,
        pl.manufacturer,
        pl.line_name
      FROM laptop_skus ls
      JOIN product_lines pl ON ls.product_line_id = pl.id
      -- Has a price
      INNER JOIN (SELECT DISTINCT laptop_sku_id FROM price_history) ph ON ph.laptop_sku_id = ls.id
      -- Has Benchmarks
      LEFT JOIN component_aliases ca_cpu ON ca_cpu.alias_name = ls.hardware_specs->>'cpu_family'
      LEFT JOIN component_benchmarks cpu ON cpu.component_name = COALESCE(ca_cpu.canonical_name, ls.hardware_specs->>'cpu_family')
      LEFT JOIN component_aliases ca_gpu ON ca_gpu.alias_name = ls.hardware_specs->>'gpu_model'
      LEFT JOIN component_benchmarks gpu ON gpu.component_name = COALESCE(ca_gpu.canonical_name, ls.hardware_specs->>'gpu_model')
      -- Has ZERO workloads
      LEFT JOIN sku_suitability ss ON ss.sku_id = ls.id
      WHERE ls.is_active = TRUE 
        AND cpu.benchmark_score IS NOT NULL 
        AND gpu.benchmark_score IS NOT NULL
        AND ss.sku_id IS NULL
      LIMIT 10;
    `;
  }
}
