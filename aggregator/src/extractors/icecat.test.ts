import { describe, it, expect } from "bun:test";
import { IcecatService } from "./icecat";

describe("IcecatService Integration", () => {
  const service = new IcecatService();

  // Skip the test if credentials are not present
  const hasCredentials =
    !!process.env.ICECAT_ACCESS_TOKEN && !!process.env.ICECAT_SHOP_NAME;

  if (!hasCredentials) {
    console.warn(
      "Skipping Icecat Integration tests: ICECAT_ACCESS_TOKEN or ICECAT_SHOP_NAME not set.",
    );
  }

  it("should fetch and map real data from Icecat API", async () => {
    if (!hasCredentials) return;

    // Using a Lenovo SKU which is usually available to Open Icecat users
    const brand = "Lenovo";
    const sku = "82WQ002RUS";

    console.log(`Fetching real data for ${brand} ${sku}...`);
    const result = await service.getProductSpecs(brand, sku);

    expect(result).not.toBeNull();

    if (result) {
      const { specs, marketingName } = result;
      console.log("Real Specs Received:", JSON.stringify(specs, null, 2));
      console.log("Marketing Name:", marketingName);

      // Basic assertions to ensure the mapping is working on real fields
      expect(specs.cpu_family).toBeDefined();
      expect(specs.ram_gb).toBeGreaterThan(0);
      expect(specs.storage_gb).toBeGreaterThan(0);
      expect(specs.screen_size_inches).toBeGreaterThan(10);
      expect(typeof specs.display_resolution).toBe("string");

      // Icecat usually provides weight in kg, ensure our lb conversion happened
      if (specs.weight_lbs) {
        expect(specs.weight_lbs).toBeGreaterThan(1);
      }
    }
  });

  it("should return null for a non-existent SKU", async () => {
    if (!hasCredentials) return;

    const specs = await service.getProductSpecs(
      "NonExistentBrand",
      "FAKE-SKU-999",
    );
    expect(specs).toBeNull();
  });
});
