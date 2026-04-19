import { db } from "../utils/connection";
import { extractId, normalizeRow } from "./utils";

export interface WorkloadRequirement {
  id: string;
  workload_name: string;
  min_specs: any;
  description: string;
}

export class WorkloadRepository {
  async upsert(
    name: string,
    minSpecs: any,
    description?: string
  ): Promise<string> {
    const result = await db`
      INSERT INTO workload_requirements (workload_name, min_specs, description)
      VALUES (${name}, ${JSON.stringify(minSpecs)}::jsonb, ${description})
      ON CONFLICT (workload_name) 
      DO UPDATE SET 
        min_specs = EXCLUDED.min_specs,
        description = COALESCE(EXCLUDED.description, workload_requirements.description)
      RETURNING id;
    `;

    return extractId(result, `Workload upsert for ${name}`);
  }

  async getAll(): Promise<WorkloadRequirement[]> {
    const result = await db`
      SELECT * FROM workload_requirements
    `;
    return (result as any[]).map(row => normalizeRow<WorkloadRequirement>(row, ["min_specs"]));
  }

  async findByName(name: string): Promise<WorkloadRequirement | null> {
    const result = await db`
      SELECT * FROM workload_requirements WHERE workload_name = ${name}
    `;
    return result.length > 0 ? normalizeRow<WorkloadRequirement>(result[0], ["min_specs"]) : null;
  }

  async deleteNotIn(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      await db`DELETE FROM workload_requirements`;
      return;
    }
    await db`DELETE FROM workload_requirements WHERE id NOT IN ${db(ids)}`;
  }
}
