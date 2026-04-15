import { db } from "./connection";

export interface PriceHistoryEntry {
  id: string;
  laptop_sku_id: string;
  vendor: string;
  price_usd: number;
  purchase_url: string;
  is_refurbished: boolean;
  recorded_at: Date;
}

export class PriceHistoryRepository {
  async add(entry: Omit<PriceHistoryEntry, "id" | "recorded_at">): Promise<string> {
    const result = await db`
      INSERT INTO price_history (laptop_sku_id, vendor, price_usd, purchase_url, is_refurbished)
      VALUES (
        ${entry.laptop_sku_id}, 
        ${entry.vendor}, 
        ${entry.price_usd}, 
        ${entry.purchase_url}, 
        ${entry.is_refurbished}
      )
      RETURNING id;
    `;

    if (result.length === 0) {
      console.error(`Price history add failed for SKU ${entry.laptop_sku_id} via ${entry.vendor}. Result:`, JSON.stringify(result));
      throw new Error(`Price history add failed for SKU ${entry.laptop_sku_id}: No rows returned`);
    }

    const row = result[0] as any;
    const id = row.id || row.ID || row.uuid || row.UUID;
    
    if (!id) {
      console.error(`Price history add returned a row but no ID column was found. Keys: ${Object.keys(row).join(", ")}`);
      throw new Error(`Price history add failed for SKU ${entry.laptop_sku_id}: ID column missing in response`);
    }

    return id as string;
  }

  async getLatestForSku(skuId: string): Promise<PriceHistoryEntry[]> {
    const result = await db`
      SELECT DISTINCT ON (vendor) * 
      FROM price_history 
      WHERE laptop_sku_id = ${skuId} 
      ORDER BY vendor, recorded_at DESC;
    `;
    return result as unknown as PriceHistoryEntry[];
  }

  async getHistoryForSku(skuId: string, limit: number = 50): Promise<PriceHistoryEntry[]> {
    const result = await db`
      SELECT * FROM price_history 
      WHERE laptop_sku_id = ${skuId} 
      ORDER BY recorded_at DESC
      LIMIT ${limit};
    `;
    return result as unknown as PriceHistoryEntry[];
  }
}
