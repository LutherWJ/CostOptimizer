import { db } from "./connection";
import { HardwareSpecs } from "../models/hardwareSpecsSchema";

export interface LaptopSku {
  id: string;
  product_line_id: string;
  sku_number: string;
  hardware_specs: HardwareSpecs;
  qualitative_data: any;
  is_active: boolean;
  created_at: Date;
}

export class LaptopSkuRepository {
  async upsert(
    productLineId: string,
    skuNumber: string,
    hardwareSpecs: HardwareSpecs,
    qualitativeData?: any
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
}
