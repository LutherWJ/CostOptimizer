import { describe, it, expect, mock } from "bun:test";
import { IcecatService } from "./icecat";

describe("IcecatService Unit Tests", () => {
  const service = new IcecatService();

  describe("getDiscoveryIndex Parsing", () => {
    it("should correctly extract laptop SKUs from a mock XML stream", async () => {
      // Mock XML using the real casing we found (Catid, Prod_ID, etc.)
      const mockXml = `
        <file Product_ID="123" Supplier_name="HP" Prod_ID="HP-SKU-1" Catid="151" Updated="20230101000000"/>
        <file Product_ID="456" Supplier_name="Dell" Prod_ID="DELL-SKU-1" Catid="151" Updated="20210101000000"/>
        <file Product_ID="789" Supplier_name="Asus" Prod_ID="ASUS-SKU-1" Catid="999" Updated="20230101000000"/>
      `;

      // Mock fetch to return a stream that mimics the decompressed XML
      const originalFetch = global.fetch;
      global.fetch = mock(async () => ({
        ok: true,
        body: {
          pipeThrough: () => ({
            getReader: () => {
              let read = false;
              return {
                read: async () => {
                  if (read) return { done: true, value: undefined };
                  read = true;
                  return { done: false, value: new TextEncoder().encode(mockXml) };
                }
              };
            }
          })
        }
      })) as any;

      // Mock credentials for the check in getDiscoveryIndex
      (service as any).username = "test";
      (service as any).password = "test";

      const sinceDate = new Date("2022-01-01");
      const results = await service.getDiscoveryIndex(sinceDate);

      expect(results).toHaveLength(1);
      const firstResult = results[0]!;
      expect(firstResult.sku).toBe("HP-SKU-1");
      expect(firstResult.brand).toBe("HP");
      expect(firstResult.icecatId).toBe("123");

      global.fetch = originalFetch;
    });

    it("should handle tags split across chunks", async () => {
      const part1 = '<file Product_ID="123" Supplier_name="HP" Prod_ID="HP-SKU-1" ';
      const part2 = 'Catid="151" Updated="20230101000000"/>';

      const originalFetch = global.fetch;
      global.fetch = mock(async () => ({
        ok: true,
        body: {
          pipeThrough: () => ({
            getReader: () => {
              let count = 0;
              return {
                read: async () => {
                  if (count === 0) { count++; return { done: false, value: new TextEncoder().encode(part1) }; }
                  if (count === 1) { count++; return { done: false, value: new TextEncoder().encode(part2) }; }
                  return { done: true, value: undefined };
                }
              };
            }
          })
        }
      })) as any;

      const results = await service.getDiscoveryIndex(new Date("2022-01-01"));
      expect(results).toHaveLength(1);
      expect(results[0]!.sku).toBe("HP-SKU-1");

      global.fetch = originalFetch;
    });
  });

  describe("mapIcecatToHardwareSpecs Logic", () => {
    it("should correctly convert units and map features", () => {
      const mockResponse = {
        data: {
          GeneralInfo: { Brand: "HP", ProductName: "Spectre", ModelName: "x360" },
          FeaturesGroups: [
            {
              Features: [
                { Feature: { Name: { Value: "Processor family" } }, PresentationValue: "Intel Core i7", RawValue: "i7" },
                { Feature: { Name: { Value: "Internal memory" }, Measure: { Sign: "GB" } }, PresentationValue: "16 GB", RawValue: 16 },
                { Feature: { Name: { Value: "Total storage capacity" }, Measure: { Sign: "GB" } } , PresentationValue: "512 GB", RawValue: 512 },
                { Feature: { Name: { Value: "Display diagonal" }, Measure: { Sign: "cm" } }, PresentationValue: "39.6 cm", RawValue: 39.6 },
                { Feature: { Name: { Value: "Weight" }, Measure: { Sign: "g" } }, PresentationValue: "1500 g", RawValue: 1500 },
                { Feature: { Name: { Value: "On-board graphics card model" } }, PresentationValue: "Intel Iris Xe Graphics", RawValue: "Iris Xe" }
              ]
            }
          ]
        }
      };

      const specs = (service as any).mapIcecatToHardwareSpecs(mockResponse);

      expect(specs.cpu_family).toBe("Intel Core i7");
      expect(specs.ram_gb).toBe(16);
      expect(specs.storage_gb).toBe(512);
      expect(specs.gpu_type).toBe("integrated");
      expect(specs.screen_size_inches).toBe(15.6);
      expect(specs.weight_lbs).toBe(3.31);
      expect(specs._brandName).toBe("HP");
    });

    it("should handle TB to GB conversion", () => {
        const mockResponse = {
          data: {
            GeneralInfo: { Brand: "Dell", ProductName: "XPS", ModelName: "13" },
            FeaturesGroups: [{
              Features: [
                { Feature: { Name: { Value: "Total storage capacity" }, Measure: { Sign: "TB" } }, PresentationValue: "1 TB", RawValue: 1 },
                { Feature: { Name: { Value: "Internal memory" } }, PresentationValue: "16", RawValue: 16 },
                { Feature: { Name: { Value: "Display diagonal" } }, PresentationValue: "14", RawValue: 14 }
              ]
            }]
          }
        };
  
        const specs = (service as any).mapIcecatToHardwareSpecs(mockResponse);
        expect(specs.storage_gb).toBe(1024);
      });
  });

  describe("parseNumeric Helper", () => {
    it("should parse various numeric formats", () => {
      const parse = (service as any).parseNumeric.bind(service);

      expect(parse({ value: "16 GB", rawValue: 16, unit: "GB" })).toBe(16);
      expect(parse({ value: "1.5", rawValue: "1.5", unit: "kg" })).toBe(1.5);
      expect(parse({ value: "N/A", rawValue: 10, unit: "" })).toBe(10);
      expect(parse({ value: "1 TB", rawValue: 1, unit: "TB" })).toBe(1024);
      expect(parse(undefined)).toBeUndefined();
    });
  });
});
