import { z } from "zod";
import hardwareSpecsSchema, { type HardwareSpecs } from "../models/hardwareSpecsSchema";

export class HardwareSpecsTransformer {
  /**
   * Validates raw data against our internal hardware spec schema.
   */
  validate(rawSpecs: any): { success: boolean; data?: HardwareSpecs; error?: z.ZodError } {
    return hardwareSpecsSchema.safeParse(rawSpecs);
  }

  /**
   * Cleans and canonicalizes brand and product line names.
   * For example, it might turn "LENOVO" into "Lenovo" or "Apple Inc." into "Apple".
   */
  canonicalizeBrand(brand: string | undefined, specs: any): string {
    const rawBrand = brand || (specs as any)._brandName || "Unknown";
    
    // Example: Basic cleanup
    let canonical = rawBrand.trim();
    if (canonical.toLowerCase() === "apple inc.") canonical = "Apple";
    
    return canonical;
  }
}
