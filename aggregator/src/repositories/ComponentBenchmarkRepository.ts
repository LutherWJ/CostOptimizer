import { db } from "./connection";
import { extractId, normalizeRow } from "./utils";

export interface ComponentBenchmark {
  id: string;
  component_name: string;
  component_type: "CPU" | "GPU";
  benchmark_score: number | null;
  extra_data: any;
  updated_at: Date;
}

export class ComponentBenchmarkRepository {
  /**
   * Helper to normalize database rows (e.g., parsing JSONB strings to objects)
   */
  private normalizeRow(row: any): ComponentBenchmark {
    return normalizeRow<ComponentBenchmark>(row, ["extra_data"]);
  }

  /**
   * Upsert a benchmark score for a component.
   */
  async upsertBenchmark(
    name: string,
    type: "CPU" | "GPU",
    score: number | null,
    extraData?: any,
  ): Promise<string> {
    const result = await db`
      INSERT INTO component_benchmarks (component_name, component_type, benchmark_score, extra_data)
      VALUES (${name}, ${type}, ${score}, ${extraData ? JSON.stringify(extraData) : null}::jsonb)
      ON CONFLICT (component_name)
      DO UPDATE SET
        benchmark_score = EXCLUDED.benchmark_score,
        extra_data = COALESCE(EXCLUDED.extra_data, component_benchmarks.extra_data),
        updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `;

    return extractId(result, `Benchmark upsert for ${name}`);
  }

  /**
   * Create an alias for a canonical component name.
   */
  async createAlias(aliasName: string, canonicalName: string): Promise<void> {
    await db`
      INSERT INTO component_aliases (alias_name, canonical_name)
      VALUES (${aliasName}, ${canonicalName})
      ON CONFLICT (alias_name)
      DO UPDATE SET canonical_name = EXCLUDED.canonical_name;
    `;
  }

  /**
   * Find a benchmark by name (checks both canonical and aliases).
   */
  async findByName(name: string): Promise<ComponentBenchmark | null> {
    const result = await db`
      WITH resolved_name AS (
        SELECT COALESCE(
          (SELECT canonical_name FROM component_aliases WHERE alias_name = ${name}),
          ${name}
        ) as name
      )
      SELECT cb.*
      FROM component_benchmarks cb
      JOIN resolved_name rn ON cb.component_name = rn.name;
    `;
    return result.length > 0 ? this.normalizeRow(result[0]) : null;
  }

  /**
   * Fuzzy find a benchmark score using pg_trgm similarity.
   */
  async fuzzyFind(name: string, threshold: number = 0.4): Promise<ComponentBenchmark[]> {
    const result = await db`
      SELECT *
      FROM component_benchmarks
      WHERE component_name % ${name}
        AND similarity(component_name, ${name}) > ${threshold}
      ORDER BY similarity(component_name, ${name}) DESC
      LIMIT 5;
    `;
    return result.map((row: any) => this.normalizeRow(row));
  }

  /**
   * Get all benchmarks of a specific type.
   */
  async findAllByType(type: "CPU" | "GPU"): Promise<ComponentBenchmark[]> {
    const result = await db`
      SELECT * FROM component_benchmarks WHERE component_type = ${type}
    `;
    return result.map((row: any) => this.normalizeRow(row));
  }
}
