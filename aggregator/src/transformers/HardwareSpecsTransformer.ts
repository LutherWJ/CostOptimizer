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

    // Standardize common brands and merge duplicates
    const mapping: Record<string, string> = {
      "dell": "Dell",
      "hp": "HP",
      "hewlett": "HP",
      "asus": "ASUS",
      "lenovo": "Lenovo",
      "apple": "Apple",
      "samsung": "Samsung",
      "acer": "Acer",
      "msi": "MSI",
      "fujitsu": "Fujitsu",
      "lg": "LG"
    };

    const lower = canonical.toLowerCase();
    for (const [key, value] of Object.entries(mapping)) {
      if (lower.includes(key)) return value;
    }
    
    // Catch common LLM misidentifications (Acura, Auscus, etc.)
    if (lower.startsWith("acu") || lower.startsWith("ausc") || lower.startsWith("ast")) {
       return "Lenovo"; // Most Flex IT Lenovo SKUs were misidentified as these
    }

    return canonical;
  }
}
