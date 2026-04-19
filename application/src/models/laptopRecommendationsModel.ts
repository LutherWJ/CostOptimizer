import { db } from "../../../aggregator/src/repositories/connection";

// Maps short URL param names to full workload names stored in DB
const WORKLOAD_NAME_MAP: Record<string, string> = {
  daily:    "Daily Browsing",
  stream:   "Streaming",
  writing:  "Writing & Study",
  casual2d: "Casual 2D Games",
  office:   "Office Productivity",
  finance:  "Finance",
  research: "Research & Analytics",
  remote:   "Remote Work & VPN",
  erp:      "ERP Systems",
  design:   "Photo & Design",
  video:    "Video Editing",
  music:    "Music Production",
  content:  "Content Creation",
  render3d: "VFX & 3D Rendering",
  webdev:   "Web Development",
  datasci:  "Data Science",
  cyber:    "Cybersecurity",
  ml:       "Machine Learning",
  gamedev:  "Game Development",
  cad:      "3D CAD / Modeling",
  arch:     "Architecture & BIM",
  science:  "Scientific Simulation",
  gis:      "GIS & Mapping",
  electrical: "Electrical / EDA",
  casual:   "Casual Gaming",
  esports:  "Esports",
  gaming:   "AAA Gaming",
  vr:       "VR Gaming",
};

// Screen size key → max/min inch ranges
const SIZE_RANGES: Record<string, { min?: number; max?: number }> = {
  compact:  { max: 13.9 },
  standard: { min: 14.0, max: 15.9 },
  desktop:  { min: 16.0 },
};

export interface LaptopRecommendation {
  recommendation_id: string;
  sku_id: string;
  manufacturer: string;
  line_name: string;
  sku_number: string;
  hardware_specs: {
    cpu_family: string;
    gpu_model: string;
    ram_gb: number;
    storage_gb: number;
    cpu_cores: number;
    gpu_type: string;
    gpu_vram_gb: number;
    screen_size_in: number;
    weight_kg: number;
    battery_hours: number;
  };
  suitable_workloads: string[];
  compatible_software_keys?: string[];
  compatible_software_names?: string[];
  current_price: number;
  best_vendor: string;
  purchase_url: string;
  is_refurbished: boolean;
  cpu_score: number | null;
  gpu_score: number | null;
  value_score: number | null;
}

export async function getRecommendations(params: {
  workloads?: string;   // comma-separated short IDs, e.g. "daily,webdev,gaming"
  software?: string;    // comma-separated software keys, e.g. "solidworks,examsoft"
  budget?: string;      // e.g. "0-600", "600-1000", "1000-1500", "1500-2500", "2500-99999", "any"
  size?: string;        // "compact" | "standard" | "desktop" | "any"
}): Promise<LaptopRecommendation[]> {
  // Build workload name list
  const workloadIds = params.workloads
    ? params.workloads.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const workloadNames = workloadIds
    .map(id => WORKLOAD_NAME_MAP[id])
    .filter(Boolean);

  // Software filter: keys are stored in compatible_software_keys on the view
  const softwareKeys = params.software
    ? params.software.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  // Build budget bounds
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  if (params.budget && params.budget !== "any") {
    const [lo, hi] = params.budget.split("-").map(Number);
    if (!isNaN(lo)) minPrice = lo;
    if (!isNaN(hi)) maxPrice = hi;
  }

  // Build size bounds
  let minSize: number | null = null;
  let maxSize: number | null = null;
  if (params.size && params.size !== "any") {
    const range = SIZE_RANGES[params.size];
    if (range) {
      minSize = range.min ?? null;
      maxSize = range.max ?? null;
    }
  }

  try {
    // Build WHERE clauses and params array for db.unsafe()
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
      whereClauses.push(`(hardware_specs->>'screen_size_in')::numeric >= $${paramIdx++}`);
      bindParams.push(minSize);
    }
    if (maxSize !== null) {
      whereClauses.push(`(hardware_specs->>'screen_size_in')::numeric <= $${paramIdx++}`);
      bindParams.push(maxSize);
    }

    // Workload filter: use ?& (jsonb "all keys/elements exist") with inline array literal
    // to avoid Bun SQL array parameter serialization issues
    if (workloadNames.length > 0) {
      const arrLiteral =
        "ARRAY[" +
        workloadNames
          .map(n => "'" + n.replace(/'/g, "''") + "'")
          .join(",") +
        "]";
      whereClauses.push(`suitable_workloads ?& ${arrLiteral}`);
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

    const rows = await db.unsafe<LaptopRecommendation[]>(sql, bindParams as unknown[]);

    // db.unsafe() returns JSONB columns as strings — parse them
    return rows.map(row => ({
      ...row,
      hardware_specs: typeof row.hardware_specs === "string"
        ? JSON.parse(row.hardware_specs)
        : row.hardware_specs,
      suitable_workloads: typeof row.suitable_workloads === "string"
        ? JSON.parse(row.suitable_workloads)
        : row.suitable_workloads,
      compatible_software_keys: typeof (row as any).compatible_software_keys === "string"
        ? JSON.parse((row as any).compatible_software_keys)
        : (row as any).compatible_software_keys,
      compatible_software_names: typeof (row as any).compatible_software_names === "string"
        ? JSON.parse((row as any).compatible_software_names)
        : (row as any).compatible_software_names,
    }));
  } catch (error) {
    console.error("❌ Database Error:", (error as Error).message);
    throw error;
  }
}
