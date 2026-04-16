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
   */
  canonicalizeBrand(indexBrand: string | undefined, specs: any): string {
    // Prioritize the brand name found inside the detailed specs over the index (supplier) name
    const specBrand = (specs as any)._brandName;
    const rawBrand = specBrand || indexBrand || "Unknown";
    
    let canonical = rawBrand.trim();

    // List of known resellers/refurbishers to ignore if we have a better name
    const resellers = ["flex it", "upcycle it", "bsi-refurbished", "bsi", "refurbished"];
    if (resellers.includes(canonical.toLowerCase()) && specBrand) {
      canonical = specBrand.trim();
    }

    // Standardize common brands
    const mapping: Record<string, string> = {
      "apple inc.": "Apple",
      "dell technologies": "Dell",
      "hewlett packard": "HP",
      "asustek computer": "ASUS",
      "lenovo group limited": "Lenovo"
    };

    const lower = canonical.toLowerCase();
    for (const [key, value] of Object.entries(mapping)) {
      if (lower.includes(key)) return value;
    }
    
    return canonical;
  }
}
