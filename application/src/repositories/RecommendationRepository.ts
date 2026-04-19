import { db } from "../utils/connection";

export class RecommendationRepository {
  async fetchRecommendations(params: {
    minPrice: number | null;
    maxPrice: number | null;
    minSize: number | null;
    maxSize: number | null;
    workloadNames: string[];
    softwareKeys: string[];
  }): Promise<any[]> {
    const { minPrice, maxPrice, minSize, maxSize, workloadNames, softwareKeys } = params;
    const whereClauses: string[] = [];
    const bindParams: (number | null)[] = [];
    let paramIdx = 1;

    if (minPrice !== null) {
      whereClauses.push(`current_price >= $${paramIdx++}`);
      bindParams.push(minPrice);
    }
    if (maxPrice !== null) {
      whereClauses.push(`current_price <= $${paramIdx++}`);
      bindParams.push(maxPrice);
    }
    if (minSize !== null) {
      whereClauses.push(`(hardware_specs->>'screen_size_inches')::numeric >= $${paramIdx++}`);
      bindParams.push(minSize);
    }
    if (maxSize !== null) {
      whereClauses.push(`(hardware_specs->>'screen_size_inches')::numeric <= $${paramIdx++}`);
      bindParams.push(maxSize);
    }

    if (workloadNames.length > 0) {
      const jsonbLiteral = "'" + JSON.stringify(workloadNames).replace(/'/g, "''") + "'::jsonb";
      whereClauses.push(`suitable_workloads @> ${jsonbLiteral}`);
    }

    if (softwareKeys.length > 0) {
      const arrLiteral =
        "ARRAY[" +
        softwareKeys
          .map(k => "'" + k.replace(/'/g, "''") + "'")
          .join(",") +
        "]";
      whereClauses.push(`compatible_software_keys ?& ${arrLiteral}`);
    }

    const whereStr =
      whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    const sql = `
      SELECT * FROM laptop_recommendations
      ${whereStr}
      ORDER BY value_score DESC NULLS LAST
      LIMIT 60
    `;

    return await db.unsafe<any[]>(sql, bindParams as unknown[]);
  }
}
