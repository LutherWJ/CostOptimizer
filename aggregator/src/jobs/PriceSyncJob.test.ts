import { describe, it, expect, mock, beforeEach } from "bun:test";
import { PriceSyncJob } from "./PriceSyncJob";
import { LaptopSkuRepository, ProductLineRepository, PriceHistoryRepository } from "../repositories";

describe("PriceSyncJob (Mock)", () => {
  let mockSkuRepo: LaptopSkuRepository;
  let mockLineRepo: ProductLineRepository;
  let mockPriceRepo: PriceHistoryRepository;
  let job: PriceSyncJob;

  beforeEach(() => {
    // Mock Repositories
    mockSkuRepo = {
      findAllWithBenchmarks: mock(async () => []),
    } as any;

    mockLineRepo = {
      findById: mock(async () => null),
    } as any;

    mockPriceRepo = {
      add: mock(async () => "price-id"),
    } as any;

    job = new PriceSyncJob(mockSkuRepo, mockLineRepo, mockPriceRepo);
  });

  it("should generate mock prices for active SKUs with benchmarks", async () => {
    const mockSku = {
      id: "sku-123",
      product_line_id: "line-456",
      sku_number: "XPS13-9315",
      marketing_name: "XPS 13 9315",
      manufacturer: "Dell",
      hardware_specs: {
        ram_gb: 16,
        storage_gb: 512,
      },
      cpu_benchmark_score: 5000,
      gpu_benchmark_score: 2000,
    };

    (mockSkuRepo.findAllWithBenchmarks as any).mockImplementation(async () => [mockSku]);

    await job.run();

    expect(mockSkuRepo.findAllWithBenchmarks).toHaveBeenCalled();
    expect(mockPriceRepo.add).toHaveBeenCalled(); // At least 1 price added
  });
});
