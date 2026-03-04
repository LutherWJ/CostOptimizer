import { db } from "./connection";

export interface RawScrape {
  id: string;
  product_line_id?: string;
  source_url: string;
  source_platform: string;
  raw_text_content?: string;
  llm_parsed_json?: any;
  scraped_at: Date;
  parsed_at?: Date;
}

export class RawScrapeRepository {
  async create(scrape: Omit<RawScrape, "id" | "scraped_at">): Promise<string> {
    const result = await db`
      INSERT INTO raw_scrapes (
        product_line_id, 
        source_url, 
        source_platform, 
        raw_text_content, 
        llm_parsed_json,
        parsed_at
      )
      VALUES (
        ${scrape.product_line_id || null}, 
        ${scrape.source_url}, 
        ${scrape.source_platform}, 
        ${scrape.raw_text_content || null}, 
        ${scrape.llm_parsed_json ? JSON.stringify(scrape.llm_parsed_json) : null}::jsonb,
        ${scrape.parsed_at || null}
      )
      RETURNING id;
    `;
    return result[0].id as string;
  }

  async getUnparsed(): Promise<RawScrape[]> {
    const result = await db`
      SELECT * FROM raw_scrapes WHERE parsed_at IS NULL
    `;
    return result as unknown as RawScrape[];
  }

  async markAsParsed(id: string, parsedJson: any): Promise<void> {
    await db`
      UPDATE raw_scrapes 
      SET 
        llm_parsed_json = ${JSON.stringify(parsedJson)}::jsonb, 
        parsed_at = CURRENT_TIMESTAMP 
      WHERE id = ${id}
    `;
  }
}
