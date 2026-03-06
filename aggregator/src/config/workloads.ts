export interface WorkloadRequirement {
  name: string;
  description: string;
  // min_specs uses a subset of HardwareSpecs for binary suitability checks
  min_specs: {
    ram_gb: number;
    cpu_cores?: number;
    gpu_type?: "integrated" | "discrete";
    vram_gb?: number;
    storage_gb?: number;
  };
}

export const WORKLOAD_DEFINITIONS: WorkloadRequirement[] = [
  {
    name: "Simple Web Browsing",
    description:
      "Perfect for students or office work. Handles tabs, emails, and video calls.",
    min_specs: {
      ram_gb: 8,
      storage_gb: 256,
      gpu_type: "integrated",
    },
  },
  {
    name: "Photo Editing",
    description:
      "Designed for photographers using Lightroom or Photoshop. Prioritizes RAM and Screen Quality.",
    min_specs: {
      ram_gb: 16,
      storage_gb: 512,
      gpu_type: "integrated", // Modern integrated is often enough, but RAM is key
    },
  },
  {
    name: "3D Modeling & Gaming",
    description:
      "High-performance workload for Blender, CAD, or modern AAA games.",
    min_specs: {
      ram_gb: 16,
      cpu_cores: 8,
      gpu_type: "discrete",
      vram_gb: 6,
    },
  },
  {
    name: "Video Editing (4K)",
    description: "Heavy lifting for Premiere Pro or DaVinci Resolve.",
    min_specs: {
      ram_gb: 32,
      cpu_cores: 8,
      gpu_type: "discrete",
      vram_gb: 8,
    },
  },
];
