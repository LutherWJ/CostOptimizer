/**
 * Seed script — 350 realistic laptops
 * Run from project root:
 *   DATABASE_URL=postgres://postgres:password@localhost:5432/laptop_db bun run postgres/seed.ts
 */

import { SQL } from "bun";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const db = new SQL(DATABASE_URL);

// ─── COMPONENT DATA ───────────────────────────────────────────────────────────

const CPU_DATA: { name: string; cores: number; score: number }[] = [
  { name: "Intel Core i3-N305",      cores: 8,  score: 5500  },
  { name: "Intel Core i5-1235U",     cores: 10, score: 11500 },
  { name: "Intel Core i5-13420H",    cores: 12, score: 14000 },
  { name: "Intel Core i5-13500H",    cores: 16, score: 17500 },
  { name: "Intel Core i7-1355U",     cores: 10, score: 13000 },
  { name: "Intel Core i7-1365U",     cores: 10, score: 14000 },
  { name: "Intel Core i7-13620H",    cores: 16, score: 19000 },
  { name: "Intel Core i7-13700H",    cores: 20, score: 22000 },
  { name: "Intel Core i9-13900H",    cores: 20, score: 28000 },
  { name: "Intel Core Ultra 5 125U", cores: 12, score: 12000 },
  { name: "Intel Core Ultra 5 125H", cores: 14, score: 18000 },
  { name: "Intel Core Ultra 7 155U", cores: 12, score: 14000 },
  { name: "Intel Core Ultra 7 155H", cores: 16, score: 24000 },
  { name: "Intel Core Ultra 9 185H", cores: 16, score: 30000 },
  { name: "AMD Ryzen 3 7330U",       cores: 4,  score: 7000  },
  { name: "AMD Ryzen 5 7530U",       cores: 6,  score: 11000 },
  { name: "AMD Ryzen 5 7535HS",      cores: 6,  score: 14000 },
  { name: "AMD Ryzen 5 7640U",       cores: 6,  score: 13000 },
  { name: "AMD Ryzen 7 7730U",       cores: 8,  score: 14500 },
  { name: "AMD Ryzen 7 7745HX",      cores: 8,  score: 24000 },
  { name: "AMD Ryzen 7 8845HS",      cores: 8,  score: 22000 },
  { name: "AMD Ryzen 9 7945HX",      cores: 16, score: 30000 },
  { name: "Apple M2",                cores: 8,  score: 15000 },
  { name: "Apple M2 Pro",            cores: 12, score: 20000 },
  { name: "Apple M3",                cores: 8,  score: 17000 },
  { name: "Apple M3 Pro",            cores: 12, score: 22000 },
  { name: "Apple M4",                cores: 10, score: 22000 },
  { name: "Apple M4 Pro",            cores: 14, score: 28000 },
];

type GpuType = "integrated" | "discrete";

const GPU_DATA: {
  name: string;
  type: GpuType;
  vram_gb: number;
  score: number;
}[] = [
  { name: "Intel Iris Xe Graphics",       type: "integrated", vram_gb: 0,  score: 2500  },
  { name: "Intel Arc Graphics",           type: "integrated", vram_gb: 0,  score: 6500  },
  { name: "AMD Radeon 610M",              type: "integrated", vram_gb: 0,  score: 2000  },
  { name: "AMD Radeon 660M",              type: "integrated", vram_gb: 0,  score: 3500  },
  { name: "AMD Radeon 680M",              type: "integrated", vram_gb: 0,  score: 5000  },
  { name: "AMD Radeon 780M",              type: "integrated", vram_gb: 0,  score: 6500  },
  { name: "AMD Radeon 890M",              type: "integrated", vram_gb: 0,  score: 8000  },
  { name: "Apple M2 GPU 8-core",          type: "integrated", vram_gb: 0,  score: 7000  },
  { name: "Apple M2 Pro GPU 16-core",     type: "integrated", vram_gb: 0,  score: 12000 },
  { name: "Apple M3 GPU 10-core",         type: "integrated", vram_gb: 0,  score: 8000  },
  { name: "Apple M3 Pro GPU 18-core",     type: "integrated", vram_gb: 0,  score: 14000 },
  { name: "Apple M4 GPU 10-core",         type: "integrated", vram_gb: 0,  score: 10000 },
  { name: "Apple M4 Pro GPU 20-core",     type: "integrated", vram_gb: 0,  score: 16000 },
  { name: "NVIDIA GeForce RTX 3050",      type: "discrete",   vram_gb: 4,  score: 9000  },
  { name: "NVIDIA GeForce RTX 3050 Ti",   type: "discrete",   vram_gb: 4,  score: 10500 },
  { name: "NVIDIA GeForce RTX 3060",      type: "discrete",   vram_gb: 6,  score: 13000 },
  { name: "NVIDIA GeForce RTX 4050",      type: "discrete",   vram_gb: 6,  score: 11000 },
  { name: "NVIDIA GeForce RTX 4060",      type: "discrete",   vram_gb: 8,  score: 14500 },
  { name: "NVIDIA GeForce RTX 4070",      type: "discrete",   vram_gb: 8,  score: 17000 },
  { name: "NVIDIA GeForce RTX 4080",      type: "discrete",   vram_gb: 12, score: 21000 },
  { name: "NVIDIA GeForce RTX 4090",      type: "discrete",   vram_gb: 16, score: 24000 },
];

// ─── WORKLOADS ────────────────────────────────────────────────────────────────

interface WorkloadReq {
  name: string;
  description: string;
  min_specs: {
    ram_gb: number;
    cpu_cores?: number;
    gpu_type?: GpuType;
    vram_gb?: number;
    storage_gb?: number;
    min_cpu_score?: number;
    min_gpu_score?: number;
    os_requirement?: "any" | "win" | "mac";
  };
}

const WORKLOADS: WorkloadReq[] = [
  { name: "Daily Browsing",       description: "Web browsing, email, social media.", min_specs: { ram_gb: 8,  storage_gb: 256, gpu_type: "integrated", min_cpu_score: 2000 } },
  { name: "Streaming",            description: "Netflix, Zoom, Google Meet.",        min_specs: { ram_gb: 8,  storage_gb: 256, gpu_type: "integrated", min_cpu_score: 3000 } },
  { name: "Writing & Study",      description: "Google Docs, Word, Notion.",         min_specs: { ram_gb: 8,  storage_gb: 256, gpu_type: "integrated", min_cpu_score: 3000 } },
  { name: "Casual 2D Games",      description: "Minecraft, Stardew Valley.",         min_specs: { ram_gb: 8,  storage_gb: 256, gpu_type: "integrated", min_cpu_score: 5000 } },
  { name: "Office Productivity",  description: "Word, Excel, PowerPoint.",           min_specs: { ram_gb: 8,  storage_gb: 256, gpu_type: "integrated", min_cpu_score: 6000,  os_requirement: "win" } },
  { name: "Finance",              description: "Excel macros, Power BI, Bloomberg.", min_specs: { ram_gb: 16, storage_gb: 256, gpu_type: "integrated", min_cpu_score: 9000,  os_requirement: "win" } },
  { name: "Research & Analytics", description: "SPSS, R, Python notebooks.",        min_specs: { ram_gb: 16, storage_gb: 512, gpu_type: "integrated", min_cpu_score: 10000 } },
  { name: "Remote Work & VPN",    description: "Citrix, VPN, remote desktop.",      min_specs: { ram_gb: 16, storage_gb: 256, gpu_type: "integrated", min_cpu_score: 7000,  os_requirement: "win" } },
  { name: "ERP Systems",          description: "SAP, Oracle ERP, Dynamics.",        min_specs: { ram_gb: 16, storage_gb: 256, gpu_type: "integrated", min_cpu_score: 10000, os_requirement: "win" } },
  { name: "Photo & Design",       description: "Lightroom, Photoshop, Figma.",      min_specs: { ram_gb: 16, storage_gb: 512, gpu_type: "integrated", min_cpu_score: 12000 } },
  { name: "Video Editing",        description: "Premiere Pro, DaVinci Resolve.",    min_specs: { ram_gb: 16, cpu_cores: 6, storage_gb: 512, gpu_type: "discrete", vram_gb: 4, min_cpu_score: 17000, min_gpu_score: 8500 } },
  { name: "Music Production",     description: "Ableton, Logic Pro, FL Studio.",    min_specs: { ram_gb: 16, storage_gb: 512, gpu_type: "integrated", min_cpu_score: 11000 } },
  { name: "Content Creation",     description: "OBS, YouTube 4K, podcast.",         min_specs: { ram_gb: 16, storage_gb: 512, gpu_type: "integrated", min_cpu_score: 13000, min_gpu_score: 5000 } },
  { name: "VFX & 3D Rendering",   description: "Blender, Houdini, After Effects.",  min_specs: { ram_gb: 32, cpu_cores: 8, storage_gb: 512, gpu_type: "discrete", vram_gb: 6, min_cpu_score: 22000, min_gpu_score: 12000, os_requirement: "win" } },
  { name: "Web Development",      description: "VS Code, Node.js, Docker.",         min_specs: { ram_gb: 16, storage_gb: 512, gpu_type: "integrated", min_cpu_score: 11000 } },
  { name: "Data Science",         description: "Jupyter, Pandas, Spark.",           min_specs: { ram_gb: 16, storage_gb: 512, gpu_type: "integrated", min_cpu_score: 13000 } },
  { name: "Cybersecurity",        description: "Kali Linux, Burp Suite, VMs.",      min_specs: { ram_gb: 16, storage_gb: 512, gpu_type: "integrated", min_cpu_score: 13000, os_requirement: "win" } },
  { name: "Machine Learning",     description: "PyTorch, TensorFlow, CUDA.",        min_specs: { ram_gb: 32, cpu_cores: 8, storage_gb: 512, gpu_type: "discrete", vram_gb: 8, min_cpu_score: 22000, min_gpu_score: 12000 } },
  { name: "Game Development",     description: "Unity, Unreal Engine.",             min_specs: { ram_gb: 32, cpu_cores: 8, storage_gb: 512, gpu_type: "discrete", vram_gb: 6, min_cpu_score: 20000, min_gpu_score: 10000, os_requirement: "win" } },
  { name: "3D CAD / Modeling",    description: "SolidWorks, AutoCAD, Fusion 360.",  min_specs: { ram_gb: 16, cpu_cores: 6, storage_gb: 512, gpu_type: "discrete", vram_gb: 4, min_cpu_score: 17000, min_gpu_score: 8500,  os_requirement: "win" } },
  { name: "Architecture & BIM",   description: "Revit, SketchUp, Rhino 3D.",        min_specs: { ram_gb: 32, cpu_cores: 8, storage_gb: 512, gpu_type: "discrete", vram_gb: 6, min_cpu_score: 22000, min_gpu_score: 12000, os_requirement: "win" } },
  { name: "Scientific Simulation",description: "MATLAB, Ansys, GROMACS.",           min_specs: { ram_gb: 32, cpu_cores: 8, storage_gb: 512, gpu_type: "discrete", vram_gb: 4, min_cpu_score: 22000, min_gpu_score: 8000,  os_requirement: "win" } },
  { name: "GIS & Mapping",        description: "ArcGIS, QGIS.",                     min_specs: { ram_gb: 16, storage_gb: 512, gpu_type: "integrated", min_cpu_score: 13000, min_gpu_score: 5000, os_requirement: "win" } },
  { name: "Electrical / EDA",     description: "Altium, KiCad, Cadence.",           min_specs: { ram_gb: 16, storage_gb: 512, gpu_type: "integrated", min_cpu_score: 13000, min_gpu_score: 4000, os_requirement: "win" } },
  { name: "Casual Gaming",        description: "Stardew Valley, Hades, Minecraft.", min_specs: { ram_gb: 16, storage_gb: 256, gpu_type: "discrete", vram_gb: 4, min_cpu_score: 8000,  min_gpu_score: 6000,  os_requirement: "win" } },
  { name: "Esports",              description: "Competitive FPS, 144Hz.",           min_specs: { ram_gb: 16, storage_gb: 256, gpu_type: "discrete", vram_gb: 6, min_cpu_score: 13000, min_gpu_score: 10000, os_requirement: "win" } },
  { name: "AAA Gaming",           description: "Cyberpunk, GTA VI, Elden Ring.",    min_specs: { ram_gb: 16, cpu_cores: 6, storage_gb: 512, gpu_type: "discrete", vram_gb: 8, min_cpu_score: 22000, min_gpu_score: 15000, os_requirement: "win" } },
  { name: "VR Gaming",            description: "Meta Quest Link, SteamVR.",         min_specs: { ram_gb: 16, cpu_cores: 8, storage_gb: 512, gpu_type: "discrete", vram_gb: 8, min_cpu_score: 28000, min_gpu_score: 18000, os_requirement: "win" } },
];

// ─── PRODUCT LINE TEMPLATES ───────────────────────────────────────────────────

interface SkuTemplate {
  sku_suffix: string;
  cpu: string;
  gpu: string;
  ram_gb: number;
  storage_gb: number;
  base_price_new: number;
  base_price_refurb?: number;
}

interface LineTemplate {
  manufacturer: string;
  line_name: string;
  screen_size_in: number;
  weight_kg: number;
  battery_hours: number;
  skus: SkuTemplate[];
}

const LINES: LineTemplate[] = [
  // ── DELL XPS 13 ───────────────────────────────────────────────────────────
  {
    manufacturer: "Dell", line_name: "XPS 13", screen_size_in: 13.4, weight_kg: 1.17, battery_hours: 12,
    skus: [
      { sku_suffix: "9340-A",  cpu: "Intel Core i5-1235U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 256, base_price_new: 999,  base_price_refurb: 749 },
      { sku_suffix: "9340-B",  cpu: "Intel Core i5-1235U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 1149, base_price_refurb: 879 },
      { sku_suffix: "9340-C",  cpu: "Intel Core i7-1355U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 1349, base_price_refurb: 1029 },
      { sku_suffix: "9340-D",  cpu: "Intel Core i7-1365U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 32, storage_gb: 1024, base_price_new: 1699, base_price_refurb: 1299 },
      { sku_suffix: "9340-E",  cpu: "Intel Core Ultra 7 155U", gpu: "Intel Arc Graphics",       ram_gb: 16, storage_gb: 512, base_price_new: 1299, base_price_refurb: 999 },
      { sku_suffix: "9340-F",  cpu: "Intel Core Ultra 7 155U", gpu: "Intel Arc Graphics",       ram_gb: 32, storage_gb: 1024, base_price_new: 1599 },
    ],
  },

  // ── DELL XPS 15 ───────────────────────────────────────────────────────────
  {
    manufacturer: "Dell", line_name: "XPS 15", screen_size_in: 15.6, weight_kg: 1.86, battery_hours: 10,
    skus: [
      { sku_suffix: "9530-A",  cpu: "Intel Core i7-13700H",    gpu: "NVIDIA GeForce RTX 4050",  ram_gb: 16, storage_gb: 512, base_price_new: 1699, base_price_refurb: 1299 },
      { sku_suffix: "9530-B",  cpu: "Intel Core i7-13700H",    gpu: "NVIDIA GeForce RTX 4060",  ram_gb: 32, storage_gb: 1024, base_price_new: 2099, base_price_refurb: 1599 },
      { sku_suffix: "9530-C",  cpu: "Intel Core i9-13900H",    gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 2499, base_price_refurb: 1899 },
      { sku_suffix: "9530-D",  cpu: "Intel Core i9-13900H",    gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 64, storage_gb: 2048, base_price_new: 2999 },
      { sku_suffix: "9530-E",  cpu: "Intel Core Ultra 7 155H", gpu: "NVIDIA GeForce RTX 4060",  ram_gb: 16, storage_gb: 512, base_price_new: 1899, base_price_refurb: 1449 },
      { sku_suffix: "9530-F",  cpu: "Intel Core Ultra 7 155H", gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 2299, base_price_refurb: 1749 },
      { sku_suffix: "9530-G",  cpu: "Intel Core Ultra 9 185H", gpu: "NVIDIA GeForce RTX 4080",  ram_gb: 64, storage_gb: 2048, base_price_new: 3499 },
    ],
  },

  // ── DELL INSPIRON 14 ─────────────────────────────────────────────────────
  {
    manufacturer: "Dell", line_name: "Inspiron 14", screen_size_in: 14.0, weight_kg: 1.51, battery_hours: 9,
    skus: [
      { sku_suffix: "5440-A",  cpu: "Intel Core i3-N305",      gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 256, base_price_new: 549,  base_price_refurb: 399 },
      { sku_suffix: "5440-B",  cpu: "Intel Core i5-13420H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 512, base_price_new: 749,  base_price_refurb: 549 },
      { sku_suffix: "5440-C",  cpu: "Intel Core i5-13420H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 899,  base_price_refurb: 679 },
      { sku_suffix: "5440-D",  cpu: "AMD Ryzen 5 7530U",       gpu: "AMD Radeon 660M",          ram_gb: 8,  storage_gb: 512, base_price_new: 699,  base_price_refurb: 519 },
      { sku_suffix: "5440-E",  cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 680M",          ram_gb: 16, storage_gb: 512, base_price_new: 899,  base_price_refurb: 679 },
      { sku_suffix: "5440-F",  cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 680M",          ram_gb: 16, storage_gb: 1024, base_price_new: 1049, base_price_refurb: 799 },
    ],
  },

  // ── DELL INSPIRON 15 ─────────────────────────────────────────────────────
  {
    manufacturer: "Dell", line_name: "Inspiron 15", screen_size_in: 15.6, weight_kg: 1.76, battery_hours: 8,
    skus: [
      { sku_suffix: "3530-A",  cpu: "Intel Core i3-N305",      gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 256, base_price_new: 499,  base_price_refurb: 369 },
      { sku_suffix: "3530-B",  cpu: "Intel Core i5-13420H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 512, base_price_new: 699,  base_price_refurb: 519 },
      { sku_suffix: "3530-C",  cpu: "Intel Core i5-13420H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 849,  base_price_refurb: 639 },
      { sku_suffix: "3530-D",  cpu: "Intel Core i5-13500H",    gpu: "NVIDIA GeForce RTX 3050",  ram_gb: 16, storage_gb: 512, base_price_new: 1099, base_price_refurb: 829 },
      { sku_suffix: "3530-E",  cpu: "AMD Ryzen 5 7535HS",      gpu: "NVIDIA GeForce RTX 3050",  ram_gb: 16, storage_gb: 512, base_price_new: 1049, base_price_refurb: 799 },
      { sku_suffix: "3530-F",  cpu: "AMD Ryzen 5 7535HS",      gpu: "NVIDIA GeForce RTX 4050",  ram_gb: 16, storage_gb: 512, base_price_new: 1199, base_price_refurb: 899 },
    ],
  },

  // ── LENOVO THINKPAD X1 CARBON ────────────────────────────────────────────
  {
    manufacturer: "Lenovo", line_name: "ThinkPad X1 Carbon", screen_size_in: 14.0, weight_kg: 1.12, battery_hours: 15,
    skus: [
      { sku_suffix: "G11-A",   cpu: "Intel Core i5-1235U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 256, base_price_new: 1399, base_price_refurb: 1069 },
      { sku_suffix: "G11-B",   cpu: "Intel Core i5-1235U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 1599, base_price_refurb: 1199 },
      { sku_suffix: "G11-C",   cpu: "Intel Core i7-1355U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 1799, base_price_refurb: 1379 },
      { sku_suffix: "G11-D",   cpu: "Intel Core i7-1365U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 32, storage_gb: 1024, base_price_new: 2199, base_price_refurb: 1699 },
      { sku_suffix: "G11-E",   cpu: "Intel Core Ultra 7 155U", gpu: "Intel Arc Graphics",       ram_gb: 32, storage_gb: 1024, base_price_new: 2099, base_price_refurb: 1599 },
      { sku_suffix: "G11-F",   cpu: "Intel Core Ultra 7 155U", gpu: "Intel Arc Graphics",       ram_gb: 64, storage_gb: 2048, base_price_new: 2799 },
    ],
  },

  // ── LENOVO THINKPAD T14 ──────────────────────────────────────────────────
  {
    manufacturer: "Lenovo", line_name: "ThinkPad T14", screen_size_in: 14.0, weight_kg: 1.38, battery_hours: 13,
    skus: [
      { sku_suffix: "G4-A",    cpu: "AMD Ryzen 5 7530U",       gpu: "AMD Radeon 660M",          ram_gb: 8,  storage_gb: 256, base_price_new: 899,  base_price_refurb: 679 },
      { sku_suffix: "G4-B",    cpu: "AMD Ryzen 5 7640U",       gpu: "AMD Radeon 780M",          ram_gb: 16, storage_gb: 512, base_price_new: 1099, base_price_refurb: 829 },
      { sku_suffix: "G4-C",    cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 780M",          ram_gb: 16, storage_gb: 512, base_price_new: 1299, base_price_refurb: 999 },
      { sku_suffix: "G4-D",    cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 780M",          ram_gb: 32, storage_gb: 1024, base_price_new: 1599, base_price_refurb: 1229 },
      { sku_suffix: "G4-E",    cpu: "Intel Core Ultra 5 125U", gpu: "Intel Arc Graphics",       ram_gb: 16, storage_gb: 512, base_price_new: 1149, base_price_refurb: 879 },
    ],
  },

  // ── LENOVO IDEAPAD SLIM 5 ────────────────────────────────────────────────
  {
    manufacturer: "Lenovo", line_name: "IdeaPad Slim 5", screen_size_in: 15.6, weight_kg: 1.62, battery_hours: 9,
    skus: [
      { sku_suffix: "82XF-A",  cpu: "AMD Ryzen 3 7330U",       gpu: "AMD Radeon 610M",          ram_gb: 8,  storage_gb: 256, base_price_new: 549,  base_price_refurb: 399 },
      { sku_suffix: "82XF-B",  cpu: "AMD Ryzen 5 7530U",       gpu: "AMD Radeon 660M",          ram_gb: 8,  storage_gb: 512, base_price_new: 699,  base_price_refurb: 519 },
      { sku_suffix: "82XF-C",  cpu: "AMD Ryzen 5 7530U",       gpu: "AMD Radeon 660M",          ram_gb: 16, storage_gb: 512, base_price_new: 849,  base_price_refurb: 639 },
      { sku_suffix: "82XF-D",  cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 680M",          ram_gb: 16, storage_gb: 512, base_price_new: 999,  base_price_refurb: 749 },
      { sku_suffix: "82XF-E",  cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 780M",          ram_gb: 16, storage_gb: 1024, base_price_new: 1149, base_price_refurb: 879 },
      { sku_suffix: "82XF-F",  cpu: "Intel Core i5-13420H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 512, base_price_new: 699,  base_price_refurb: 519 },
      { sku_suffix: "82XF-G",  cpu: "Intel Core i7-13620H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 999,  base_price_refurb: 749 },
    ],
  },

  // ── LENOVO LEGION SLIM 5 ─────────────────────────────────────────────────
  {
    manufacturer: "Lenovo", line_name: "Legion Slim 5", screen_size_in: 16.0, weight_kg: 2.0, battery_hours: 7,
    skus: [
      { sku_suffix: "82YA-A",  cpu: "AMD Ryzen 5 7535HS",      gpu: "NVIDIA GeForce RTX 4050",  ram_gb: 16, storage_gb: 512, base_price_new: 1099, base_price_refurb: 839 },
      { sku_suffix: "82YA-B",  cpu: "AMD Ryzen 5 7535HS",      gpu: "NVIDIA GeForce RTX 4060",  ram_gb: 16, storage_gb: 512, base_price_new: 1299, base_price_refurb: 999 },
      { sku_suffix: "82YA-C",  cpu: "AMD Ryzen 7 7745HX",      gpu: "NVIDIA GeForce RTX 4060",  ram_gb: 16, storage_gb: 512, base_price_new: 1399, base_price_refurb: 1069 },
      { sku_suffix: "82YA-D",  cpu: "AMD Ryzen 7 7745HX",      gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 1799, base_price_refurb: 1379 },
      { sku_suffix: "82YA-E",  cpu: "AMD Ryzen 7 8845HS",      gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 1899, base_price_refurb: 1449 },
      { sku_suffix: "82YA-F",  cpu: "AMD Ryzen 9 7945HX",      gpu: "NVIDIA GeForce RTX 4080",  ram_gb: 32, storage_gb: 1024, base_price_new: 2399, base_price_refurb: 1829 },
      { sku_suffix: "82YA-G",  cpu: "AMD Ryzen 9 7945HX",      gpu: "NVIDIA GeForce RTX 4090",  ram_gb: 64, storage_gb: 2048, base_price_new: 3199 },
    ],
  },

  // ── ASUS ZENBOOK 14 ───────────────────────────────────────────────────────
  {
    manufacturer: "ASUS", line_name: "ZenBook 14", screen_size_in: 14.0, weight_kg: 1.39, battery_hours: 11,
    skus: [
      { sku_suffix: "UX3402-A", cpu: "Intel Core i5-1235U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 512, base_price_new: 799,  base_price_refurb: 599 },
      { sku_suffix: "UX3402-B", cpu: "Intel Core i5-1235U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 949,  base_price_refurb: 719 },
      { sku_suffix: "UX3402-C", cpu: "Intel Core i7-1355U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 1199, base_price_refurb: 899 },
      { sku_suffix: "UX3402-D", cpu: "Intel Core Ultra 5 125H", gpu: "Intel Arc Graphics",       ram_gb: 16, storage_gb: 512, base_price_new: 1099, base_price_refurb: 839 },
      { sku_suffix: "UX3402-E", cpu: "Intel Core Ultra 7 155H", gpu: "Intel Arc Graphics",       ram_gb: 32, storage_gb: 1024, base_price_new: 1499, base_price_refurb: 1149 },
      { sku_suffix: "UX3402-F", cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 780M",          ram_gb: 16, storage_gb: 512, base_price_new: 999,  base_price_refurb: 749 },
    ],
  },

  // ── ASUS VIVOBOOK 15 ──────────────────────────────────────────────────────
  {
    manufacturer: "ASUS", line_name: "VivoBook 15", screen_size_in: 15.6, weight_kg: 1.70, battery_hours: 8,
    skus: [
      { sku_suffix: "X1504-A", cpu: "Intel Core i3-N305",      gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 256, base_price_new: 449,  base_price_refurb: 329 },
      { sku_suffix: "X1504-B", cpu: "Intel Core i5-13420H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 512, base_price_new: 649,  base_price_refurb: 479 },
      { sku_suffix: "X1504-C", cpu: "Intel Core i5-13420H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 799,  base_price_refurb: 599 },
      { sku_suffix: "X1504-D", cpu: "AMD Ryzen 5 7530U",       gpu: "AMD Radeon 660M",          ram_gb: 8,  storage_gb: 512, base_price_new: 599,  base_price_refurb: 449 },
      { sku_suffix: "X1504-E", cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 680M",          ram_gb: 16, storage_gb: 512, base_price_new: 849,  base_price_refurb: 639 },
      { sku_suffix: "X1504-F", cpu: "Intel Core i7-13620H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 949,  base_price_refurb: 719 },
    ],
  },

  // ── ASUS ROG ZEPHYRUS G16 ─────────────────────────────────────────────────
  {
    manufacturer: "ASUS", line_name: "ROG Zephyrus G16", screen_size_in: 16.0, weight_kg: 1.85, battery_hours: 8,
    skus: [
      { sku_suffix: "GA605-A", cpu: "AMD Ryzen 7 8845HS",      gpu: "NVIDIA GeForce RTX 4060",  ram_gb: 16, storage_gb: 512, base_price_new: 1599, base_price_refurb: 1229 },
      { sku_suffix: "GA605-B", cpu: "AMD Ryzen 7 8845HS",      gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 16, storage_gb: 1024, base_price_new: 1899, base_price_refurb: 1449 },
      { sku_suffix: "GA605-C", cpu: "AMD Ryzen 9 7945HX",      gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 2199, base_price_refurb: 1679 },
      { sku_suffix: "GA605-D", cpu: "AMD Ryzen 9 7945HX",      gpu: "NVIDIA GeForce RTX 4080",  ram_gb: 32, storage_gb: 2048, base_price_new: 2699, base_price_refurb: 2049 },
      { sku_suffix: "GA605-E", cpu: "AMD Ryzen 9 7945HX",      gpu: "NVIDIA GeForce RTX 4090",  ram_gb: 64, storage_gb: 2048, base_price_new: 3499 },
      { sku_suffix: "GA605-F", cpu: "Intel Core Ultra 9 185H", gpu: "NVIDIA GeForce RTX 4080",  ram_gb: 32, storage_gb: 2048, base_price_new: 2899, base_price_refurb: 2199 },
    ],
  },

  // ── ASUS PROART P16 ───────────────────────────────────────────────────────
  {
    manufacturer: "ASUS", line_name: "ProArt P16", screen_size_in: 16.0, weight_kg: 1.95, battery_hours: 9,
    skus: [
      { sku_suffix: "H7606-A", cpu: "AMD Ryzen 7 8845HS",      gpu: "NVIDIA GeForce RTX 4060",  ram_gb: 32, storage_gb: 1024, base_price_new: 1799, base_price_refurb: 1379 },
      { sku_suffix: "H7606-B", cpu: "AMD Ryzen 9 7945HX",      gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 2199, base_price_refurb: 1679 },
      { sku_suffix: "H7606-C", cpu: "AMD Ryzen 9 7945HX",      gpu: "NVIDIA GeForce RTX 4080",  ram_gb: 64, storage_gb: 2048, base_price_new: 2999, base_price_refurb: 2299 },
      { sku_suffix: "H7606-D", cpu: "Intel Core Ultra 9 185H", gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 2299, base_price_refurb: 1749 },
    ],
  },

  // ── HP SPECTRE X360 ───────────────────────────────────────────────────────
  {
    manufacturer: "HP", line_name: "Spectre x360", screen_size_in: 14.0, weight_kg: 1.41, battery_hours: 13,
    skus: [
      { sku_suffix: "EW1000-A", cpu: "Intel Core i7-1355U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 1399, base_price_refurb: 1069 },
      { sku_suffix: "EW1000-B", cpu: "Intel Core i7-1365U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 1024, base_price_new: 1599, base_price_refurb: 1229 },
      { sku_suffix: "EW1000-C", cpu: "Intel Core Ultra 7 155U", gpu: "Intel Arc Graphics",       ram_gb: 16, storage_gb: 512, base_price_new: 1499, base_price_refurb: 1149 },
      { sku_suffix: "EW1000-D", cpu: "Intel Core Ultra 7 155U", gpu: "Intel Arc Graphics",       ram_gb: 32, storage_gb: 1024, base_price_new: 1799, base_price_refurb: 1379 },
      { sku_suffix: "EW1000-E", cpu: "Intel Core Ultra 7 155H", gpu: "Intel Arc Graphics",       ram_gb: 32, storage_gb: 1024, base_price_new: 1999, base_price_refurb: 1529 },
    ],
  },

  // ── HP ENVY X360 ──────────────────────────────────────────────────────────
  {
    manufacturer: "HP", line_name: "Envy x360", screen_size_in: 15.6, weight_kg: 1.79, battery_hours: 10,
    skus: [
      { sku_suffix: "FE0000-A", cpu: "AMD Ryzen 5 7530U",       gpu: "AMD Radeon 660M",          ram_gb: 8,  storage_gb: 256, base_price_new: 749,  base_price_refurb: 559 },
      { sku_suffix: "FE0000-B", cpu: "AMD Ryzen 5 7640U",       gpu: "AMD Radeon 780M",          ram_gb: 16, storage_gb: 512, base_price_new: 999,  base_price_refurb: 749 },
      { sku_suffix: "FE0000-C", cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 780M",          ram_gb: 16, storage_gb: 512, base_price_new: 1149, base_price_refurb: 879 },
      { sku_suffix: "FE0000-D", cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 780M",          ram_gb: 32, storage_gb: 1024, base_price_new: 1399, base_price_refurb: 1069 },
      { sku_suffix: "FE0000-E", cpu: "Intel Core Ultra 5 125U", gpu: "Intel Arc Graphics",       ram_gb: 16, storage_gb: 512, base_price_new: 949,  base_price_refurb: 719 },
      { sku_suffix: "FE0000-F", cpu: "Intel Core Ultra 7 155U", gpu: "Intel Arc Graphics",       ram_gb: 16, storage_gb: 512, base_price_new: 1149, base_price_refurb: 879 },
    ],
  },

  // ── APPLE MACBOOK AIR 13 ─────────────────────────────────────────────────
  {
    manufacturer: "Apple", line_name: "MacBook Air 13", screen_size_in: 13.6, weight_kg: 1.24, battery_hours: 18,
    skus: [
      { sku_suffix: "MBA13-M2A",  cpu: "Apple M2",     gpu: "Apple M2 GPU 8-core",      ram_gb: 8,  storage_gb: 256, base_price_new: 1099, base_price_refurb: 849 },
      { sku_suffix: "MBA13-M2B",  cpu: "Apple M2",     gpu: "Apple M2 GPU 8-core",      ram_gb: 16, storage_gb: 512, base_price_new: 1499, base_price_refurb: 1149 },
      { sku_suffix: "MBA13-M3A",  cpu: "Apple M3",     gpu: "Apple M3 GPU 10-core",     ram_gb: 8,  storage_gb: 256, base_price_new: 1299, base_price_refurb: 999 },
      { sku_suffix: "MBA13-M3B",  cpu: "Apple M3",     gpu: "Apple M3 GPU 10-core",     ram_gb: 16, storage_gb: 512, base_price_new: 1699, base_price_refurb: 1299 },
      { sku_suffix: "MBA13-M4A",  cpu: "Apple M4",     gpu: "Apple M4 GPU 10-core",     ram_gb: 16, storage_gb: 512, base_price_new: 1299, base_price_refurb: 999 },
      { sku_suffix: "MBA13-M4B",  cpu: "Apple M4",     gpu: "Apple M4 GPU 10-core",     ram_gb: 32, storage_gb: 1024, base_price_new: 1799, base_price_refurb: 1399 },
    ],
  },

  // ── APPLE MACBOOK AIR 15 ─────────────────────────────────────────────────
  {
    manufacturer: "Apple", line_name: "MacBook Air 15", screen_size_in: 15.3, weight_kg: 1.51, battery_hours: 18,
    skus: [
      { sku_suffix: "MBA15-M2A",  cpu: "Apple M2",     gpu: "Apple M2 GPU 8-core",      ram_gb: 8,  storage_gb: 256, base_price_new: 1299, base_price_refurb: 999 },
      { sku_suffix: "MBA15-M2B",  cpu: "Apple M2",     gpu: "Apple M2 GPU 8-core",      ram_gb: 16, storage_gb: 512, base_price_new: 1699, base_price_refurb: 1299 },
      { sku_suffix: "MBA15-M3A",  cpu: "Apple M3",     gpu: "Apple M3 GPU 10-core",     ram_gb: 8,  storage_gb: 256, base_price_new: 1499, base_price_refurb: 1149 },
      { sku_suffix: "MBA15-M3B",  cpu: "Apple M3",     gpu: "Apple M3 GPU 10-core",     ram_gb: 16, storage_gb: 512, base_price_new: 1899, base_price_refurb: 1449 },
      { sku_suffix: "MBA15-M4A",  cpu: "Apple M4",     gpu: "Apple M4 GPU 10-core",     ram_gb: 16, storage_gb: 512, base_price_new: 1499, base_price_refurb: 1149 },
      { sku_suffix: "MBA15-M4B",  cpu: "Apple M4",     gpu: "Apple M4 GPU 10-core",     ram_gb: 32, storage_gb: 1024, base_price_new: 1999, base_price_refurb: 1529 },
    ],
  },

  // ── APPLE MACBOOK PRO 14 ─────────────────────────────────────────────────
  {
    manufacturer: "Apple", line_name: "MacBook Pro 14", screen_size_in: 14.2, weight_kg: 1.55, battery_hours: 22,
    skus: [
      { sku_suffix: "MBP14-M2A",  cpu: "Apple M2 Pro", gpu: "Apple M2 Pro GPU 16-core", ram_gb: 16, storage_gb: 512, base_price_new: 1999, base_price_refurb: 1529 },
      { sku_suffix: "MBP14-M2B",  cpu: "Apple M2 Pro", gpu: "Apple M2 Pro GPU 16-core", ram_gb: 32, storage_gb: 1024, base_price_new: 2499, base_price_refurb: 1899 },
      { sku_suffix: "MBP14-M3A",  cpu: "Apple M3 Pro", gpu: "Apple M3 Pro GPU 18-core", ram_gb: 18, storage_gb: 512, base_price_new: 1999, base_price_refurb: 1529 },
      { sku_suffix: "MBP14-M3B",  cpu: "Apple M3 Pro", gpu: "Apple M3 Pro GPU 18-core", ram_gb: 36, storage_gb: 1024, base_price_new: 2799, base_price_refurb: 2149 },
      { sku_suffix: "MBP14-M4A",  cpu: "Apple M4 Pro", gpu: "Apple M4 Pro GPU 20-core", ram_gb: 24, storage_gb: 512, base_price_new: 1999, base_price_refurb: 1529 },
      { sku_suffix: "MBP14-M4B",  cpu: "Apple M4 Pro", gpu: "Apple M4 Pro GPU 20-core", ram_gb: 48, storage_gb: 1024, base_price_new: 2799, base_price_refurb: 2149 },
    ],
  },

  // ── APPLE MACBOOK PRO 16 ─────────────────────────────────────────────────
  {
    manufacturer: "Apple", line_name: "MacBook Pro 16", screen_size_in: 16.2, weight_kg: 2.15, battery_hours: 22,
    skus: [
      { sku_suffix: "MBP16-M2A",  cpu: "Apple M2 Pro", gpu: "Apple M2 Pro GPU 16-core", ram_gb: 16, storage_gb: 512, base_price_new: 2499, base_price_refurb: 1899 },
      { sku_suffix: "MBP16-M2B",  cpu: "Apple M2 Pro", gpu: "Apple M2 Pro GPU 16-core", ram_gb: 32, storage_gb: 1024, base_price_new: 2999, base_price_refurb: 2299 },
      { sku_suffix: "MBP16-M3A",  cpu: "Apple M3 Pro", gpu: "Apple M3 Pro GPU 18-core", ram_gb: 18, storage_gb: 512, base_price_new: 2499, base_price_refurb: 1899 },
      { sku_suffix: "MBP16-M3B",  cpu: "Apple M3 Pro", gpu: "Apple M3 Pro GPU 18-core", ram_gb: 36, storage_gb: 1024, base_price_new: 3499, base_price_refurb: 2699 },
      { sku_suffix: "MBP16-M4A",  cpu: "Apple M4 Pro", gpu: "Apple M4 Pro GPU 20-core", ram_gb: 24, storage_gb: 512, base_price_new: 2499, base_price_refurb: 1899 },
      { sku_suffix: "MBP16-M4B",  cpu: "Apple M4 Pro", gpu: "Apple M4 Pro GPU 20-core", ram_gb: 48, storage_gb: 1024, base_price_new: 3499, base_price_refurb: 2699 },
    ],
  },

  // ── ACER SWIFT 3 ─────────────────────────────────────────────────────────
  {
    manufacturer: "Acer", line_name: "Swift 3", screen_size_in: 14.0, weight_kg: 1.45, battery_hours: 11,
    skus: [
      { sku_suffix: "SF314-A",  cpu: "Intel Core i5-1235U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 256, base_price_new: 699,  base_price_refurb: 519 },
      { sku_suffix: "SF314-B",  cpu: "Intel Core i5-1235U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 849,  base_price_refurb: 639 },
      { sku_suffix: "SF314-C",  cpu: "Intel Core i7-1355U",     gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 999,  base_price_refurb: 749 },
      { sku_suffix: "SF314-D",  cpu: "AMD Ryzen 5 7530U",       gpu: "AMD Radeon 660M",          ram_gb: 8,  storage_gb: 512, base_price_new: 649,  base_price_refurb: 479 },
      { sku_suffix: "SF314-E",  cpu: "AMD Ryzen 7 7730U",       gpu: "AMD Radeon 680M",          ram_gb: 16, storage_gb: 512, base_price_new: 899,  base_price_refurb: 679 },
    ],
  },

  // ── ACER ASPIRE 5 ─────────────────────────────────────────────────────────
  {
    manufacturer: "Acer", line_name: "Aspire 5", screen_size_in: 15.6, weight_kg: 1.80, battery_hours: 8,
    skus: [
      { sku_suffix: "A515-A",  cpu: "Intel Core i3-N305",      gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 256, base_price_new: 429,  base_price_refurb: 319 },
      { sku_suffix: "A515-B",  cpu: "Intel Core i5-13420H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 8,  storage_gb: 512, base_price_new: 599,  base_price_refurb: 449 },
      { sku_suffix: "A515-C",  cpu: "Intel Core i5-13420H",    gpu: "Intel Iris Xe Graphics",   ram_gb: 16, storage_gb: 512, base_price_new: 749,  base_price_refurb: 559 },
      { sku_suffix: "A515-D",  cpu: "AMD Ryzen 5 7535HS",      gpu: "NVIDIA GeForce RTX 3050",  ram_gb: 8,  storage_gb: 512, base_price_new: 799,  base_price_refurb: 599 },
      { sku_suffix: "A515-E",  cpu: "AMD Ryzen 5 7535HS",      gpu: "NVIDIA GeForce RTX 3050",  ram_gb: 16, storage_gb: 512, base_price_new: 949,  base_price_refurb: 719 },
      { sku_suffix: "A515-F",  cpu: "Intel Core i7-13620H",    gpu: "NVIDIA GeForce RTX 3050",  ram_gb: 16, storage_gb: 512, base_price_new: 1049, base_price_refurb: 799 },
    ],
  },

  // ── MSI PRESTIGE 14 ──────────────────────────────────────────────────────
  {
    manufacturer: "MSI", line_name: "Prestige 14", screen_size_in: 14.0, weight_kg: 1.29, battery_hours: 10,
    skus: [
      { sku_suffix: "C14M-A",  cpu: "Intel Core Ultra 5 125H", gpu: "Intel Arc Graphics",       ram_gb: 16, storage_gb: 512, base_price_new: 1099, base_price_refurb: 839 },
      { sku_suffix: "C14M-B",  cpu: "Intel Core Ultra 7 155H", gpu: "Intel Arc Graphics",       ram_gb: 32, storage_gb: 1024, base_price_new: 1399, base_price_refurb: 1069 },
      { sku_suffix: "C14M-C",  cpu: "AMD Ryzen 7 7745HX",      gpu: "NVIDIA GeForce RTX 4050",  ram_gb: 16, storage_gb: 512, base_price_new: 1199, base_price_refurb: 919 },
      { sku_suffix: "C14M-D",  cpu: "AMD Ryzen 7 7745HX",      gpu: "NVIDIA GeForce RTX 4060",  ram_gb: 32, storage_gb: 1024, base_price_new: 1599, base_price_refurb: 1229 },
    ],
  },

  // ── MSI STEALTH 16 ───────────────────────────────────────────────────────
  {
    manufacturer: "MSI", line_name: "Stealth 16", screen_size_in: 16.0, weight_kg: 2.10, battery_hours: 7,
    skus: [
      { sku_suffix: "16AI-A",  cpu: "Intel Core Ultra 7 155H", gpu: "NVIDIA GeForce RTX 4060",  ram_gb: 16, storage_gb: 512, base_price_new: 1799, base_price_refurb: 1379 },
      { sku_suffix: "16AI-B",  cpu: "Intel Core Ultra 7 155H", gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 2199, base_price_refurb: 1679 },
      { sku_suffix: "16AI-C",  cpu: "Intel Core Ultra 9 185H", gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 2599, base_price_refurb: 1999 },
      { sku_suffix: "16AI-D",  cpu: "Intel Core Ultra 9 185H", gpu: "NVIDIA GeForce RTX 4080",  ram_gb: 32, storage_gb: 2048, base_price_new: 2999, base_price_refurb: 2299 },
      { sku_suffix: "16AI-E",  cpu: "Intel Core Ultra 9 185H", gpu: "NVIDIA GeForce RTX 4090",  ram_gb: 64, storage_gb: 2048, base_price_new: 3799 },
      { sku_suffix: "16AI-F",  cpu: "AMD Ryzen 9 7945HX",      gpu: "NVIDIA GeForce RTX 4080",  ram_gb: 32, storage_gb: 2048, base_price_new: 2799, base_price_refurb: 2149 },
      { sku_suffix: "16AI-G",  cpu: "AMD Ryzen 9 7945HX",      gpu: "NVIDIA GeForce RTX 4090",  ram_gb: 64, storage_gb: 2048, base_price_new: 3599 },
    ],
  },

  // ── RAZER BLADE 15 ───────────────────────────────────────────────────────
  {
    manufacturer: "Razer", line_name: "Blade 15", screen_size_in: 15.6, weight_kg: 2.01, battery_hours: 6,
    skus: [
      { sku_suffix: "RZ09-15A", cpu: "Intel Core i7-13700H",    gpu: "NVIDIA GeForce RTX 4050",  ram_gb: 16, storage_gb: 512, base_price_new: 1999, base_price_refurb: 1529 },
      { sku_suffix: "RZ09-15B", cpu: "Intel Core i7-13700H",    gpu: "NVIDIA GeForce RTX 4060",  ram_gb: 16, storage_gb: 1024, base_price_new: 2299, base_price_refurb: 1749 },
      { sku_suffix: "RZ09-15C", cpu: "Intel Core i9-13900H",    gpu: "NVIDIA GeForce RTX 4070",  ram_gb: 32, storage_gb: 1024, base_price_new: 2999, base_price_refurb: 2299 },
      { sku_suffix: "RZ09-15D", cpu: "Intel Core i9-13900H",    gpu: "NVIDIA GeForce RTX 4080",  ram_gb: 32, storage_gb: 2048, base_price_new: 3499, base_price_refurb: 2699 },
      { sku_suffix: "RZ09-15E", cpu: "Intel Core Ultra 9 185H", gpu: "NVIDIA GeForce RTX 4090",  ram_gb: 64, storage_gb: 2048, base_price_new: 4499 },
    ],
  },

  // ── RAZER BLADE 18 ───────────────────────────────────────────────────────
  {
    manufacturer: "Razer", line_name: "Blade 18", screen_size_in: 18.0, weight_kg: 3.00, battery_hours: 5,
    skus: [
      { sku_suffix: "RZ09-18A", cpu: "Intel Core i9-13900H",    gpu: "NVIDIA GeForce RTX 4080",  ram_gb: 32, storage_gb: 1024, base_price_new: 3999, base_price_refurb: 3069 },
      { sku_suffix: "RZ09-18B", cpu: "Intel Core i9-13900H",    gpu: "NVIDIA GeForce RTX 4090",  ram_gb: 32, storage_gb: 2048, base_price_new: 4999, base_price_refurb: 3849 },
      { sku_suffix: "RZ09-18C", cpu: "Intel Core Ultra 9 185H", gpu: "NVIDIA GeForce RTX 4090",  ram_gb: 64, storage_gb: 4096, base_price_new: 5999 },
    ],
  },
];

// ─── SUITABILITY LOGIC ────────────────────────────────────────────────────────

function isSuitable(
  specs: {
    ram_gb: number;
    storage_gb: number;
    cpu_cores: number;
    gpu_type: GpuType;
    gpu_vram_gb: number;
  },
  cpuScore: number,
  gpuScore: number,
  manufacturer: string,
  workload: WorkloadReq,
): boolean {
  const min = workload.min_specs;

  if (specs.ram_gb < min.ram_gb) return false;
  if (min.storage_gb && specs.storage_gb < min.storage_gb) return false;
  if (min.cpu_cores && specs.cpu_cores < min.cpu_cores) return false;
  // "integrated" means any GPU is fine; "discrete" means must have dedicated GPU
  if (min.gpu_type === "discrete" && specs.gpu_type !== "discrete") return false;
  if (min.vram_gb && specs.gpu_vram_gb < min.vram_gb) return false;
  if (min.min_cpu_score && cpuScore < min.min_cpu_score) return false;
  if (min.min_gpu_score && gpuScore < min.min_gpu_score) return false;
  if (min.os_requirement === "win" && manufacturer === "Apple") return false;
  if (min.os_requirement === "mac" && manufacturer !== "Apple") return false;

  return true;
}

// ─── MAIN SEED ────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // 1. Clear existing data
  console.log("  Clearing existing data...");
  await db`DROP MATERIALIZED VIEW IF EXISTS laptop_recommendations CASCADE`;
  await db`TRUNCATE price_history, sku_suitability, workload_requirements, laptop_skus, product_lines, component_benchmarks, component_aliases RESTART IDENTITY CASCADE`;

  // 2. Insert CPUs
  console.log("  Inserting CPUs...");
  for (const cpu of CPU_DATA) {
    await db`
      INSERT INTO component_benchmarks (component_name, component_type, benchmark_score)
      VALUES (${cpu.name}, 'CPU', ${cpu.score})
      ON CONFLICT (component_name) DO UPDATE SET benchmark_score = EXCLUDED.benchmark_score
    `;
  }

  // 3. Insert GPUs
  console.log("  Inserting GPUs...");
  for (const gpu of GPU_DATA) {
    await db`
      INSERT INTO component_benchmarks (component_name, component_type, benchmark_score)
      VALUES (${gpu.name}, 'GPU', ${gpu.score})
      ON CONFLICT (component_name) DO UPDATE SET benchmark_score = EXCLUDED.benchmark_score
    `;
  }

  // 4. Insert workloads
  console.log("  Inserting workloads...");
  const workloadIdMap = new Map<string, string>();
  for (const w of WORKLOADS) {
    const rows = await db`
      INSERT INTO workload_requirements (workload_name, min_specs, description)
      VALUES (${w.name}, ${w.min_specs}, ${w.description})
      ON CONFLICT (workload_name) DO UPDATE SET min_specs = EXCLUDED.min_specs
      RETURNING id
    `;
    workloadIdMap.set(w.name, rows[0].id);
  }

  // 5. Build CPU/GPU lookup maps
  const cpuMap = new Map(CPU_DATA.map(c => [c.name, c]));
  const gpuMap = new Map(GPU_DATA.map(g => [g.name, g]));

  // 6. Insert product lines + SKUs + prices + suitability
  let totalSkus = 0;
  let totalSuitability = 0;

  for (const line of LINES) {
    // Insert product line
    const lineRows = await db`
      INSERT INTO product_lines (manufacturer, line_name)
      VALUES (${line.manufacturer}, ${line.line_name})
      ON CONFLICT (manufacturer, line_name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    const lineId = lineRows[0].id;

    for (const sku of line.skus) {
      const cpu = cpuMap.get(sku.cpu)!;
      const gpu = gpuMap.get(sku.gpu)!;

      const hardwareSpecs = {
        cpu_family:     cpu.name,
        gpu_model:      gpu.name,
        ram_gb:         sku.ram_gb,
        storage_gb:     sku.storage_gb,
        cpu_cores:      cpu.cores,
        gpu_type:       gpu.type,
        gpu_vram_gb:    gpu.vram_gb,
        screen_size_in: line.screen_size_in,
        weight_kg:      line.weight_kg,
        battery_hours:  line.battery_hours,
      };

      const skuNumber = `${line.manufacturer}-${line.line_name.replace(/\s+/g, "-")}-${sku.sku_suffix}`;

      const skuRows = await db`
        INSERT INTO laptop_skus (product_line_id, sku_number, hardware_specs)
        VALUES (${lineId}, ${skuNumber}, ${hardwareSpecs})
        ON CONFLICT (sku_number) DO UPDATE SET hardware_specs = EXCLUDED.hardware_specs
        RETURNING id
      `;
      const skuId = skuRows[0].id;
      totalSkus++;

      // Insert new price
      const searchQuery = encodeURIComponent(`${line.manufacturer} ${line.line_name} ${sku.sku_suffix}`);
      await db`
        INSERT INTO price_history (laptop_sku_id, vendor, price_usd, purchase_url, is_refurbished)
        VALUES (
          ${skuId}, 'eBay', ${sku.base_price_new},
          ${"https://www.ebay.com/sch/i.html?_nkw=" + searchQuery + "&LH_BIN=1&LH_ItemCondition=1000"},
          false
        )
      `;

      // Insert refurb price (if available)
      if (sku.base_price_refurb) {
        await db`
          INSERT INTO price_history (laptop_sku_id, vendor, price_usd, purchase_url, is_refurbished)
          VALUES (
            ${skuId}, 'eBay', ${sku.base_price_refurb},
            ${"https://www.ebay.com/sch/i.html?_nkw=" + searchQuery + "&LH_BIN=1&LH_ItemCondition=2500"},
            true
          )
        `;
      }

      // Compute suitability
      for (const workload of WORKLOADS) {
        const suitable = isSuitable(
          {
            ram_gb:      sku.ram_gb,
            storage_gb:  sku.storage_gb,
            cpu_cores:   cpu.cores,
            gpu_type:    gpu.type,
            gpu_vram_gb: gpu.vram_gb,
          },
          cpu.score,
          gpu.score,
          line.manufacturer,
          workload,
        );

        if (suitable) {
          const workloadId = workloadIdMap.get(workload.name)!;
          await db`
            INSERT INTO sku_suitability (sku_id, workload_id)
            VALUES (${skuId}, ${workloadId})
            ON CONFLICT DO NOTHING
          `;
          totalSuitability++;
        }
      }
    }

    process.stdout.write(`    ${line.manufacturer} ${line.line_name}: ${line.skus.length} SKUs\n`);
  }

  // 7. Recreate materialized view
  console.log("\n  Recreating materialized view...");
  await db`
    CREATE MATERIALIZED VIEW laptop_recommendations AS
    WITH latest_prices AS (
      SELECT DISTINCT ON (laptop_sku_id, vendor, is_refurbished)
        laptop_sku_id, vendor, price_usd, purchase_url, is_refurbished, recorded_at
      FROM price_history
      ORDER BY laptop_sku_id, vendor, is_refurbished, recorded_at DESC
    ),
    best_deals AS (
      SELECT DISTINCT ON (laptop_sku_id, is_refurbished)
        laptop_sku_id, vendor, price_usd, purchase_url, is_refurbished
      FROM latest_prices
      ORDER BY laptop_sku_id, is_refurbished, price_usd ASC
    ),
    suitability_agg AS (
      SELECT sku_id, jsonb_agg(wr.workload_name) as workloads
      FROM sku_suitability ss
      JOIN workload_requirements wr ON ss.workload_id = wr.id
      GROUP BY sku_id
    )
    SELECT
      md5(ls.id::text || bd.is_refurbished::text) as recommendation_id,
      ls.id as sku_id,
      pl.manufacturer,
      pl.line_name,
      ls.sku_number,
      ls.hardware_specs,
      ls.qualitative_data,
      COALESCE(sa.workloads, '[]'::jsonb) as suitable_workloads,
      bd.price_usd as current_price,
      bd.vendor as best_vendor,
      bd.purchase_url,
      bd.is_refurbished,
      ls.updated_at as last_synced,
      cpu.benchmark_score as cpu_score,
      gpu.benchmark_score as gpu_score,
      (
        (COALESCE(cpu.benchmark_score, 0) +
         COALESCE(gpu.benchmark_score, 0) +
         (COALESCE((ls.hardware_specs->>'storage_gb')::numeric, 0) * 10))
        / NULLIF(bd.price_usd, 0)
      ) as value_score
    FROM laptop_skus ls
    JOIN product_lines pl ON ls.product_line_id = pl.id
    LEFT JOIN suitability_agg sa ON ls.id = sa.sku_id
    JOIN best_deals bd ON ls.id = bd.laptop_sku_id
    LEFT JOIN component_aliases ca_cpu ON ca_cpu.alias_name = ls.hardware_specs->>'cpu_family'
    LEFT JOIN component_benchmarks cpu ON cpu.component_name = COALESCE(ca_cpu.canonical_name, ls.hardware_specs->>'cpu_family')
    LEFT JOIN component_aliases ca_gpu ON ca_gpu.alias_name = ls.hardware_specs->>'gpu_model'
    LEFT JOIN component_benchmarks gpu ON gpu.component_name = COALESCE(ca_gpu.canonical_name, ls.hardware_specs->>'gpu_model')
    WHERE ls.is_active = TRUE
  `;

  await db`CREATE INDEX idx_rec_workloads ON laptop_recommendations USING GIN (suitable_workloads)`;
  await db`CREATE INDEX idx_rec_price ON laptop_recommendations (current_price)`;
  await db`CREATE INDEX idx_rec_manufacturer ON laptop_recommendations (manufacturer)`;

  console.log(`\n✅ Seed complete!`);
  console.log(`   ${totalSkus} SKUs across ${LINES.length} product lines`);
  console.log(`   ${totalSuitability} suitability mappings`);

  await db.close();
}

main().catch(err => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
