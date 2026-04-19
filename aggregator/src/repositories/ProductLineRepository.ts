import { db } from "./connection";
import { extractId } from "./utils";

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
    
    return extractId(result, `Product Line upsert for ${manufacturer} ${line_name}`);
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
