import { db } from "./connection";
import type { HardwareSpecs } from "../models/hardwareSpecsSchema";

export interface LaptopSku {
  id: string;
  product_line_id: string;
  sku_number: string;
  hardware_specs: HardwareSpecs;
  qualitative_data: any;
  is_active: boolean;
  created_at: Date;
}

export interface LaptopSkuWithBenchmarks extends LaptopSku {
  cpu_benchmark_score?: number;
  gpu_benchmark_score?: number;
}

export class LaptopSkuRepository {
  async upsert(
    productLineId: string,
    skuNumber: string,
    hardwareSpecs: HardwareSpecs,
    qualitativeData?: any,
  ): Promise<string> {
    const result = await db`
      INSERT INTO laptop_skus (product_line_id, sku_number, hardware_specs, qualitative_data)
      VALUES (
        ${productLineId}, 
        ${skuNumber}, 
        ${JSON.stringify(hardwareSpecs)}::jsonb, 
        ${qualitativeData ? JSON.stringify(qualitativeData) : null}::jsonb
      )
      ON CONFLICT (sku_number) 
      DO UPDATE SET 
        hardware_specs = EXCLUDED.hardware_specs,
        qualitative_data = COALESCE(EXCLUDED.qualitative_data, laptop_skus.qualitative_data)
      RETURNING id;
    `;
    return result[0].id as string;
  }

  async findBySkuNumber(skuNumber: string): Promise<LaptopSku | null> {
    const result = await db`
      SELECT * FROM laptop_skus WHERE sku_number = ${skuNumber}
    `;
    return result.length > 0 ? (result[0] as unknown as LaptopSku) : null;
  }

  async updateSuitability(skuId: string, workloadIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx`DELETE FROM sku_suitability WHERE sku_id = ${skuId}`;
      for (const workloadId of workloadIds) {
        await tx`
          INSERT INTO sku_suitability (sku_id, workload_id) 
          VALUES (${skuId}, ${workloadId})
          ON CONFLICT DO NOTHING
        `;
      }
    });
  }

  async findAllActive(): Promise<LaptopSku[]> {
    const result = await db`
      SELECT * FROM laptop_skus WHERE is_active = TRUE
    `;
    return result as unknown as LaptopSku[];
  }

  /**
   * Fetches all active SKUs along with their corresponding CPU and GPU benchmark scores
   * by joining the hardware_specs JSONB fields against the component_benchmarks table.
   */
  async findAllWithBenchmarks(): Promise<LaptopSkuWithBenchmarks[]> {
    const result = await db`
      SELECT 
        ls.*,
        cpu.benchmark_score as cpu_benchmark_score,
        gpu.benchmark_score as gpu_benchmark_score
      FROM laptop_skus ls
      -- Join for CPU
      LEFT JOIN component_aliases ca_cpu ON ca_cpu.alias_name = ls.hardware_specs->>'cpu_family'
      LEFT JOIN component_benchmarks cpu ON cpu.component_name = COALESCE(ca_cpu.canonical_name, ls.hardware_specs->>'cpu_family')
      -- Join for GPU
      LEFT JOIN component_aliases ca_gpu ON ca_gpu.alias_name = ls.hardware_specs->>'gpu_model'
      LEFT JOIN component_benchmarks gpu ON gpu.component_name = COALESCE(ca_gpu.canonical_name, ls.hardware_specs->>'gpu_model')
      WHERE ls.is_active = TRUE;
    `;
    return result as unknown as LaptopSkuWithBenchmarks[];
  }
}
