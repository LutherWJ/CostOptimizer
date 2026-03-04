import { describe, it, expect, mock, beforeEach } from "bun:test";
import { PriceSyncJob } from "./PriceSyncJob";
import { IPriceProvider, PriceResult } from "../types";
import { LaptopSkuRepository, ProductLineRepository, PriceHistoryRepository } from "../repositories";

describe("PriceSyncJob", () => {
  let mockProvider: IPriceProvider;
  let mockSkuRepo: LaptopSkuRepository;
  let mockLineRepo: ProductLineRepository;
  let mockPriceRepo: PriceHistoryRepository;
  let job: PriceSyncJob;

  beforeEach(() => {
    // Mock Price Provider
    mockProvider = {
      vendorName: "MockVendor",
      getLatestPrice: mock(async () => null),
    };

    // Mock Repositories
    mockSkuRepo = {
      findAllActive: mock(async () => []),
      findBySkuNumber: mock(async () => null),
      upsert: mock(async () => "sku-id"),
    } as any;

    mockLineRepo = {
      findById: mock(async () => null),
      upsert: mock(async () => "line-id"),
    } as any;

    mockPriceRepo = {
      add: mock(async () => "price-id"),
      getLatestForSku: mock(async () => []),
    } as any;

    job = new PriceSyncJob([mockProvider], mockSkuRepo, mockLineRepo, mockPriceRepo);
  });

  it("should sync prices for active SKUs", async () => {
    const mockSku = {
      id: "sku-123",
      product_line_id: "line-456",
      sku_number: "XPS13-9315",
    };

    const mockLine = {
      id: "line-456",
      manufacturer: "Dell",
      line_name: "XPS 13",
    };

    const mockPriceResult: PriceResult = {
      vendor: "MockVendor",
      price_usd: 899.99,
      purchase_url: "https://example.com/buy",
      is_refurbished: false,
    };

    (mockSkuRepo.findAllActive as any).mockImplementation(async () => [mockSku]);
    (mockLineRepo.findById as any).mockImplementation(async () => mockLine);
    (mockProvider.getLatestPrice as any).mockImplementation(async () => mockPriceResult);

    await job.run();

    expect(mockSkuRepo.findAllActive).toHaveBeenCalled();
    expect(mockLineRepo.findById).toHaveBeenCalledWith("line-456");
    expect(mockProvider.getLatestPrice).toHaveBeenCalledWith("Dell", "XPS13-9315");
    expect(mockPriceRepo.add).toHaveBeenCalledWith({
      laptop_sku_id: "sku-123",
      vendor: "MockVendor",
      price_usd: 899.99,
      purchase_url: "https://example.com/buy",
      is_refurbished: false,
    });
  });

  it("should handle cases where no price is found", async () => {
    const mockSku = {
      id: "sku-789",
      product_line_id: "line-012",
      sku_number: "Spectre-x360",
    };

    (mockSkuRepo.findAllActive as any).mockImplementation(async () => [mockSku]);
    (mockLineRepo.findById as any).mockImplementation(async () => ({ manufacturer: "HP" }));
    (mockProvider.getLatestPrice as any).mockImplementation(async () => null);

    await job.run();

    expect(mockProvider.getLatestPrice).toHaveBeenCalled();
    expect(mockPriceRepo.add).not.toHaveBeenCalled();
  });

  it("should handle provider errors gracefully", async () => {
    const mockSku = {
      id: "sku-error",
      product_line_id: "line-error",
      sku_number: "ERROR-SKU",
    };

    (mockSkuRepo.findAllActive as any).mockImplementation(async () => [mockSku]);
    (mockLineRepo.findById as any).mockImplementation(async () => ({ manufacturer: "ERROR-BRAND" }));
    (mockProvider.getLatestPrice as any).mockImplementation(async () => {
      throw new Error("API Failure");
    });

    await job.run();

    expect(mockProvider.getLatestPrice).toHaveBeenCalled();
    // Job should continue and log error, not crash
    expect(mockPriceRepo.add).not.toHaveBeenCalled();
  });
});
