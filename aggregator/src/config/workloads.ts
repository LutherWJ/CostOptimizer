export interface WorkloadRequirement {
  name: string;
  description: string;
  // min_specs uses a subset of HardwareSpecs + benchmark scores for binary suitability checks
  min_specs: {
    ram_gb: number;
    cpu_cores?: number;
    gpu_type?: "integrated" | "discrete";
    vram_gb?: number;
    storage_gb?: number;
    min_cpu_score?: number;
    min_gpu_score?: number;
  };
}

export const WORKLOAD_DEFINITIONS: readonly WorkloadRequirement[] =
  Object.freeze([
    {
      name: "Simple Web Browsing",
      description:
        "Perfect for students or office work. Handles tabs, emails, and video calls.",
      min_specs: {
        ram_gb: 8,
        storage_gb: 256,
        gpu_type: "integrated",
        min_cpu_score: 2000, // Basic modern performance
      },
    },
    {
      name: "Photo Editing",
      description:
        "Designed for photographers using Lightroom or Photoshop. Prioritizes RAM and CPU performance.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 6000, // Solid multi-core for exports
      },
    },
    {
      name: "3D Modeling & Gaming",
      description:
        "High-performance workload for Blender, CAD, or modern AAA games.",
      min_specs: {
        ram_gb: 16,
        cpu_cores: 6,
        gpu_type: "discrete",
        vram_gb: 4,
        min_cpu_score: 8000,
        min_gpu_score: 5000, // Entry-level dedicated GPU
      },
    },
    {
      name: "Video Editing (4K)",
      description: "Heavy lifting for Premiere Pro or DaVinci Resolve.",
      min_specs: {
        ram_gb: 32,
        cpu_cores: 8,
        gpu_type: "discrete",
        vram_gb: 6,
        min_cpu_score: 12000,
        min_gpu_score: 8000, // Mid-range dedicated GPU
      },
    },
  ]);
