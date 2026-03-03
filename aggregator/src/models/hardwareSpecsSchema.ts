import { z } from "zod";

const hardwareSpecsSchema = z.object({
  cpu_family: z.string(),
  ram_gb: z.int().positive(),
  storage_gb: z.int().positive(),
  gpu_model: z.string().optional(),
  gpu_vram_gb: z.int().positive().optional(),
  display_resolution: z.string(),
  color_gamut_coverage: z.string().optional(),
  battery_wh: z.float32().optional(),
  weight_lbs: z.float32().positive().optional(),
  is_upgradable: z.boolean().nullable,
});

export default hardwareSpecsSchema;
