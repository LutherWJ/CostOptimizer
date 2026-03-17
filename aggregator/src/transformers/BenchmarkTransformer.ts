export class BenchmarkTransformer {
  /**
   * Transforms raw benchmark records into canonical database formats.
   * Can handle score normalization or mapping to standard component types.
   */
  transformBenchmark(raw: {
    name: string;
    type: string;
    score: number;
    extra_data?: any;
  }) {
    return {
      name: raw.name.trim(),
      type: raw.type as "CPU" | "GPU",
      score: Math.round(raw.score),
      extra_data: raw.extra_data || null
    };
  }
}
