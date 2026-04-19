import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../utils/logger";
import { db } from "../repositories/connection";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function asJson(value: any): any {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function renderWorkloadDoc(row: {
  id: string;
  workload_name: string;
  description: string | null;
  min_specs: any;
}): string {
  const minSpecs = asJson(row.min_specs) ?? {};
  const updatedAt = new Date().toISOString();

  return (
    `# Workload Requirement: ${row.workload_name}\n\n` +
    `Generated from the database.\n\n` +
    `- Workload ID: \`${row.id}\`\n` +
    `- Generated at: \`${updatedAt}\`\n\n` +
    (row.description ? `## Description\n\n${row.description}\n\n` : "") +
    `## Minimum Specs\n\n` +
    "```json\n" +
    `${JSON.stringify(minSpecs, null, 2)}\n` +
    "```\n"
  );
}

function renderSoftwareDoc(row: {
  id: string;
  software_key: string;
  software_name: string;
  description: string | null;
  required_workloads: any;
  os_requirement: string;
  source_url: string | null;
  last_verified: string | null;
}): string {
  const reqWorkloads = asJson(row.required_workloads) ?? [];
  const updatedAt = new Date().toISOString();

  return (
    `# Software Requirement: ${row.software_name}\n\n` +
    `Generated from the database.\n\n` +
    `- Software key: \`${row.software_key}\`\n` +
    `- Software ID: \`${row.id}\`\n` +
    `- OS requirement: \`${row.os_requirement}\`\n` +
    (row.last_verified ? `- Last verified: \`${row.last_verified}\`\n` : "") +
    `- Generated at: \`${updatedAt}\`\n\n` +
    (row.description ? `## Description\n\n${row.description}\n\n` : "") +
    (row.source_url ? `## Source\n\n${row.source_url}\n\n` : "") +
    `## Required Workloads\n\n` +
    "```json\n" +
    `${JSON.stringify(reqWorkloads, null, 2)}\n` +
    "```\n"
  );
}

export class DbDocsExportJob {
  async exportWorkloadRequirements(outDir: string): Promise<void> {
    logger.info(`[Docs] Exporting workload_requirements to ${outDir}...`);
    await mkdir(outDir, { recursive: true });

    const rows = await db<{
      id: string;
      workload_name: string;
      description: string | null;
      min_specs: any;
    }[]>`
      SELECT id, workload_name, description, min_specs
      FROM workload_requirements
      ORDER BY workload_name ASC
    `;

    logger.info(`[Docs] Found ${rows.length} workload(s).`);

    for (const row of rows as any[]) {
      const slug = slugify(row.workload_name) || row.id;
      const filename = `${slug}.md`;
      const path = join(outDir, filename);
      const content = renderWorkloadDoc(row);
      await writeFile(path, content, "utf8");
    }

    logger.info("[Docs] Export complete: workload_requirements");
  }

  async exportSoftwareRequirements(outDir: string): Promise<void> {
    logger.info(`[Docs] Exporting software_requirements to ${outDir}...`);
    await mkdir(outDir, { recursive: true });

    const rows = await db<{
      id: string;
      software_key: string;
      software_name: string;
      description: string | null;
      required_workloads: any;
      os_requirement: string;
      source_url: string | null;
      last_verified: string | null;
    }[]>`
      SELECT
        id,
        software_key,
        software_name,
        description,
        required_workloads,
        os_requirement,
        source_url,
        last_verified
      FROM software_requirements
      ORDER BY software_key ASC
    `;

    logger.info(`[Docs] Found ${rows.length} software profile(s).`);

    for (const row of rows as any[]) {
      const slug = slugify(row.software_key) || row.id;
      const filename = `${slug}.md`;
      const path = join(outDir, filename);
      const content = renderSoftwareDoc(row);
      await writeFile(path, content, "utf8");
    }

    logger.info("[Docs] Export complete: software_requirements");
  }
}
