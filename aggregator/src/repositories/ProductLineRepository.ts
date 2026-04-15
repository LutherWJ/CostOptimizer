import { db } from "./connection";

export interface ProductLine {
  id: string;
  manufacturer: string;
  line_name: string;
  created_at: Date;
  updated_at: Date;
}

export class ProductLineRepository {
  async upsert(manufacturer: string, line_name: string): Promise<string> {
    const result = await db`
      INSERT INTO product_lines (manufacturer, line_name)
      VALUES (${manufacturer}, ${line_name})
      ON CONFLICT (manufacturer, line_name) 
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `;
    
    if (result.length === 0) {
      console.error(`Upsert failed for ${manufacturer} ${line_name}. Result:`, JSON.stringify(result));
      throw new Error(`Upsert failed for ${manufacturer} ${line_name}: No rows returned. Check if the table has triggers or if the database is in read-only mode.`);
    }
    
    // Case-insensitive ID lookup
    const row = result[0] as any;
    const id = row.id || row.ID || row.uuid || row.UUID;
    
    if (!id) {
      console.error(`Upsert returned a row but no ID column was found. Keys: ${Object.keys(row).join(", ")}`);
      throw new Error(`Upsert failed for ${manufacturer} ${line_name}: ID column missing in response`);
    }
    
    return id as string;
  }

  async findById(id: string): Promise<ProductLine | null> {
    const result = await db`
      SELECT * FROM product_lines WHERE id = ${id}
    `;
    return result.length > 0 ? (result[0] as unknown as ProductLine) : null;
  }

  async findByName(manufacturer: string, line_name: string): Promise<ProductLine | null> {
    const result = await db`
      SELECT * FROM product_lines 
      WHERE manufacturer = ${manufacturer} AND line_name = ${line_name}
    `;
    return result.length > 0 ? (result[0] as unknown as ProductLine) : null;
  }
}
