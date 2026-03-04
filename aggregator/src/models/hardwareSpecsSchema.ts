import { z } from "zod";

const hardwareSpecsSchema = z.object({
  // Core Specs
  cpu_family: z.string(),
  cpu_cores: z.number().int().positive().optional(),
  ram_gb: z.number().int().positive(),
  storage_gb: z.number().int().positive(),
  
  // Graphics
  gpu_model: z.string().optional(),
  gpu_type: z.enum(["integrated", "discrete"]),
  gpu_vram_gb: z.number().int().nonnegative().optional(),
  
  // Display
  screen_size_inches: z.number().positive(),
  display_resolution: z.string(),
  panel_type: z.string().optional(), // e.g., "IPS", "OLED"
  color_gamut_coverage: z.string().optional(), // e.g., "100% sRGB"
  nits: z.number().int().positive().optional(),
  
  // Physical & Battery
  battery_wh: z.number().positive().optional(),
  weight_lbs: z.number().positive().optional(),
  is_upgradable: z.boolean().nullable().optional(),
});

export type HardwareSpecs = z.infer<typeof hardwareSpecsSchema>;
export default hardwareSpecsSchema;
