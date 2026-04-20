import type { RecommendationRepository } from "../repositories/RecommendationRepository";
import type { LaptopRecommendation } from "../models/laptopRecommendationsModel";

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

export class RecommendationService {
  constructor(private repo: RecommendationRepository) {}

  async getRecommendations(params: {
    workloads?: string;
    software?: string;
    budget?: string;
    budgetNudgeSteps?: number; // 0-5, each step widens max by +10% (disabled for "any" and "$2.5k+")
    size?: string;
  }): Promise<LaptopRecommendation[]> {
    // Build workload name list
    const workloadIds = params.workloads
      ? params.workloads.split(",").map(s => s.trim()).filter(Boolean)
      : [];
    const workloadNames = workloadIds
      .map(id => WORKLOAD_NAME_MAP[id])
      .filter(Boolean);

    // Software filter
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

    // Optional max widening ("nudge"): +10% per step, up to +50%.
    // Hidden/disabled for "No limit" and "$2.5k+" (effectively unlimited max).
    const rawSteps = Number.isFinite(params.budgetNudgeSteps as number)
      ? Math.trunc(params.budgetNudgeSteps as number)
      : 0;
    const steps = Math.max(0, Math.min(5, rawSteps));
    const nudgeEnabled =
      steps > 0 &&
      params.budget &&
      params.budget !== "any" &&
      params.budget !== "2500-99999" &&
      maxPrice !== null &&
      maxPrice < 99999;
    if (nudgeEnabled && maxPrice !== null) {
      maxPrice = Math.round(maxPrice * (1 + steps * 0.1));
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
      const rows = await this.repo.fetchRecommendations({
        minPrice,
        maxPrice,
        minSize,
        maxSize,
        workloadNames,
        softwareKeys,
      });

      // Map database fields to the interface expected by the frontend
      return rows.map((row) => this.mapRowToRecommendation(row));
    } catch (error) {
      console.error("❌ Service Error:", (error as Error).message);
      throw error;
    }
  }

  private mapRowToRecommendation(row: any): LaptopRecommendation {
    const rawSpecs = typeof row.hardware_specs === "string"
      ? JSON.parse(row.hardware_specs)
      : row.hardware_specs;

    const parseMaybeJson = <T>(value: unknown): T | undefined => {
      if (value === null || value === undefined) return undefined;
      if (typeof value === "string") return JSON.parse(value) as T;
      return value as T;
    };

    const hardware_specs = {
      cpu_family: rawSpecs.cpu_family,
      gpu_model: rawSpecs.gpu_model || "Integrated Graphics",
      ram_gb: rawSpecs.ram_gb,
      storage_gb: rawSpecs.storage_gb,
      cpu_cores: rawSpecs.cpu_cores || 0,
      gpu_type: rawSpecs.gpu_type,
      gpu_vram_gb: rawSpecs.gpu_vram_gb || 0,
      screen_size_in: rawSpecs.screen_size_inches,
      weight_kg: rawSpecs.weight_lbs
        ? Math.round(rawSpecs.weight_lbs * 0.453592 * 10) / 10
        : 1.5,
      battery_hours: rawSpecs.battery_wh ? Math.round(rawSpecs.battery_wh / 10) : 8,
    };

    return Object.assign({}, row, {
      hardware_specs,
      suitable_workloads: parseMaybeJson<string[]>(row.suitable_workloads) || [],
      compatible_software_keys: parseMaybeJson<string[]>((row as any).compatible_software_keys),
      compatible_software_names: parseMaybeJson<string[]>((row as any).compatible_software_names),
    });
  }
}
