import { db } from "./connection";

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

    if (result.length === 0) {
      console.error(`Workload upsert failed for ${name}. Result:`, JSON.stringify(result));
      throw new Error(`Workload upsert failed for ${name}: No rows returned`);
    }

    const row = result[0] as any;
    const id = row.id || row.ID || row.uuid || row.UUID;
    
    if (!id) {
      console.error(`Workload upsert returned a row but no ID column was found. Keys: ${Object.keys(row).join(", ")}`);
      throw new Error(`Workload upsert failed for ${name}: ID column missing in response`);
    }

    return id as string;
  }

  async getAll(): Promise<WorkloadRequirement[]> {
    const result = await db`
      SELECT * FROM workload_requirements
    `;
    return result as unknown as WorkloadRequirement[];
  }

  async findByName(name: string): Promise<WorkloadRequirement | null> {
    const result = await db`
      SELECT * FROM workload_requirements WHERE workload_name = ${name}
    `;
    return result.length > 0 ? (result[0] as unknown as WorkloadRequirement) : null;
  }
}
