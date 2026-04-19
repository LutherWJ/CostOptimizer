import { db } from "../utils/connection";

export interface SoftwareRequirementRow {
  id: string;
  software_key: string;
  software_name: string;
  description: string | null;
  required_workloads: any;
  os_requirement: "any" | "win" | "mac";
  source_url: string | null;
  last_verified: string | null;
}

export class SoftwareRequirementsRepository {
  async upsert(params: {
    software_key: string;
    software_name: string;
    description?: string | null;
    required_workloads: string[];
    os_requirement?: "any" | "win" | "mac";
    source_url?: string | null;
    last_verified?: string | null; // YYYY-MM-DD
  }): Promise<string> {
    const result = await db`
      INSERT INTO software_requirements (
        software_key,
        software_name,
        description,
        required_workloads,
        os_requirement,
        source_url,
        last_verified
      )
      VALUES (
        ${params.software_key},
        ${params.software_name},
        ${params.description || null},
        ${JSON.stringify(params.required_workloads)}::jsonb,
        ${(params.os_requirement || "any") as any},
        ${params.source_url || null},
        ${params.last_verified || null}
      )
      ON CONFLICT (software_key)
      DO UPDATE SET
        software_name = EXCLUDED.software_name,
        description = COALESCE(EXCLUDED.description, software_requirements.description),
        required_workloads = EXCLUDED.required_workloads,
        os_requirement = EXCLUDED.os_requirement,
        source_url = COALESCE(EXCLUDED.source_url, software_requirements.source_url),
        last_verified = COALESCE(EXCLUDED.last_verified, software_requirements.last_verified),
        updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `;

    if (result.length === 0) {
      throw new Error(
        `Software requirement upsert failed for ${params.software_key}: no rows returned`,
      );
    }
    return (result[0] as any).id as string;
  }

  async getAll(): Promise<SoftwareRequirementRow[]> {
    const result = await db`
      SELECT *
      FROM software_requirements
      ORDER BY software_key ASC
    `;
    return result as unknown as SoftwareRequirementRow[];
  }
}
