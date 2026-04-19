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
      // Notebookcheck ratings are percentages (0-100). 
      // Scale by 300 to match the 30,000 threshold scale in workloads.ts.
      score: Math.round(raw.score * 300),
      extra_data: raw.extra_data || null
    };
  }
}
