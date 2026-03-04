import { describe, it, expect, mock, beforeEach } from "bun:test";
import { LaptopDiscoveryJob } from "./LaptopDiscoveryJob";
import type { IIcecatService, IcecatIndexItem } from "../types";
import { LaptopSkuRepository, ProductLineRepository } from "../repositories";
import type { HardwareSpecs } from "../models/hardwareSpecsSchema";

describe("LaptopDiscoveryJob", () => {
  let mockIcecat: IIcecatService;
  let mockSkuRepo: LaptopSkuRepository;
  let mockLineRepo: ProductLineRepository;
  let job: LaptopDiscoveryJob;

  beforeEach(() => {
    // Mock Icecat Service
    mockIcecat = {
      getDiscoveryIndex: mock(async () => []),
      getProductSpecs: mock(async () => null),
      getRawProductData: mock(async () => null),
    };

    // Mock Repositories
    mockSkuRepo = {
      findBySkuNumber: mock(async () => null),
      upsert: mock(async () => "sku-id"),
      updateSuitability: mock(async () => {}),
      findAllActive: mock(async () => []),
    } as any;

    mockLineRepo = {
      upsert: mock(async () => "line-id"),
      findById: mock(async () => null),
      findByName: mock(async () => null),
    } as any;

    job = new LaptopDiscoveryJob(mockIcecat, mockSkuRepo, mockLineRepo);
  });

  it("should skip SKUs that already exist in the database", async () => {
    const indexItem: IcecatIndexItem = {
      icecatId: "123",
      brand: "Dell",
      sku: "XPS13-9315",
    };

    (mockIcecat.getDiscoveryIndex as any).mockImplementation(async () => [
      indexItem,
    ]);
    (mockSkuRepo.findBySkuNumber as any).mockImplementation(async () => ({
      id: "existing-id",
    }));

    await job.run(new Date("2022-01-01"));

    expect(mockIcecat.getDiscoveryIndex).toHaveBeenCalled();
    expect(mockSkuRepo.findBySkuNumber).toHaveBeenCalledWith("XPS13-9315");
    expect(mockIcecat.getProductSpecs).not.toHaveBeenCalled();
    expect(mockSkuRepo.upsert).not.toHaveBeenCalled();
  });

  it("should import new SKUs from Icecat", async () => {
    const indexItem: IcecatIndexItem = {
      icecatId: "456",
      brand: "HP",
      sku: "Spectre-x360",
    };

    const mockSpecs: HardwareSpecs = {
      cpu_family: "Intel Core i7",
      ram_gb: 16,
      storage_gb: 512,
      gpu_type: "integrated",
      screen_size_inches: 13.5,
      display_resolution: "3000x2000",
    } as any;
    (mockSpecs as any)._brandName = "HP";

    (mockIcecat.getDiscoveryIndex as any).mockImplementation(async () => [
      indexItem,
    ]);
    (mockSkuRepo.findBySkuNumber as any).mockImplementation(async () => null);
    (mockIcecat.getProductSpecs as any).mockImplementation(
      async () => mockSpecs,
    );
    (mockLineRepo.upsert as any).mockImplementation(async () => "new-line-id");

    await job.run(new Date("2022-01-01"));

    expect(mockSkuRepo.findBySkuNumber).toHaveBeenCalledWith("Spectre-x360");
    expect(mockIcecat.getProductSpecs).toHaveBeenCalledWith(
      "HP",
      "Spectre-x360",
      "456"
    );
    expect(mockLineRepo.upsert).toHaveBeenCalledWith("HP", "HP");
    expect(mockSkuRepo.upsert).toHaveBeenCalledWith(
      "new-line-id",
      "Spectre-x360",
      mockSpecs,
    );
  });

  it("should handle cases where specs cannot be found", async () => {
    const indexItem: IcecatIndexItem = {
      icecatId: "789",
      brand: "Lenovo",
      sku: "ThinkPad-X1",
    };

    (mockIcecat.getDiscoveryIndex as any).mockImplementation(async () => [
      indexItem,
    ]);
    (mockSkuRepo.findBySkuNumber as any).mockImplementation(async () => null);
    (mockIcecat.getProductSpecs as any).mockImplementation(async () => null);

    await job.run(new Date("2022-01-01"));

    expect(mockIcecat.getProductSpecs).toHaveBeenCalled();
    expect(mockSkuRepo.upsert).not.toHaveBeenCalled();
  });

  it("should respect the limit parameter", async () => {
    const items: IcecatIndexItem[] = [
      { icecatId: "1", brand: "A", sku: "S1" },
      { icecatId: "2", brand: "B", sku: "S2" },
      { icecatId: "3", brand: "C", sku: "S3" },
    ];

    (mockIcecat.getDiscoveryIndex as any).mockImplementation(async (_date: Date, limit?: number) => {
        return items.slice(0, limit);
    });
    
    await job.run(new Date(), 2);

    expect(mockIcecat.getDiscoveryIndex).toHaveBeenCalledWith(expect.any(Date), 2);
    // Since getDiscoveryIndex handles the limit, we expect it to return 2 items
  });
});
