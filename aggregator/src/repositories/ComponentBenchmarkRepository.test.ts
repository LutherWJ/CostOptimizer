import { describe, it, expect, beforeAll } from "bun:test";
import { ComponentBenchmarkRepository } from "./ComponentBenchmarkRepository";
import { db } from "./connection";

describe("ComponentBenchmarkRepository", () => {
  const repo = new ComponentBenchmarkRepository();

  beforeAll(async () => {
    // Clean up test data if it exists
    await db`DELETE FROM component_aliases WHERE alias_name LIKE 'TEST_%'`;
    await db`DELETE FROM component_benchmarks WHERE component_name LIKE 'TEST_%'`;
  });

  it("should upsert a benchmark and retrieve it", async () => {
    const name = "TEST_GPU_1";
    const id = await repo.upsertBenchmark(name, "GPU", 85, { info: "test" });
    
    expect(id).toBeDefined();

    const benchmark = await repo.findByName(name);
    expect(benchmark).not.toBeNull();
    expect(benchmark?.component_name).toBe(name);
    expect(benchmark?.benchmark_score).toBe(85);
    expect(benchmark?.extra_data.info).toBe("test");
  });

  it("should handle aliases correctly", async () => {
    const canonical = "TEST_CPU_CANONICAL";
    const alias = "TEST_CPU_ALIAS";

    await repo.upsertBenchmark(canonical, "CPU", 90);
    await repo.createAlias(alias, canonical);

    const benchmark = await repo.findByName(alias);
    expect(benchmark).not.toBeNull();
    expect(benchmark?.component_name).toBe(canonical);
    expect(benchmark?.benchmark_score).toBe(90);
  });

  it("should perform fuzzy search", async () => {
    await repo.upsertBenchmark("TEST_NVIDIA GeForce RTX 4060", "GPU", 70);
    
    // Search with a slight variation
    const results = await repo.fuzzyFind("TEST_NVIDIA RTX 4060", 0.3);
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.component_name).toContain("4060");
  });
});
