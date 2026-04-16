export interface WorkloadRequirement {
  name: string;
  description: string;
  min_specs: {
    ram_gb: number;
    cpu_cores?: number;
    gpu_type?: "integrated" | "discrete";
    vram_gb?: number;
    storage_gb?: number;
    min_cpu_score?: number;
    min_gpu_score?: number;
    os_requirement?: "any" | "win" | "mac";
  };
}

export const WORKLOAD_DEFINITIONS: readonly WorkloadRequirement[] =
  Object.freeze([

    // ── EVERYDAY ─────────────────────────────────────────────────────────────

    {
      name: "Daily Browsing",
      description: "Web browsing, email, social media, shopping, and maps.",
      min_specs: {
        ram_gb: 8,
        storage_gb: 256,
        gpu_type: "integrated",
        min_cpu_score: 2000,
      },
    },
    {
      name: "Streaming",
      description: "Netflix, Disney+, Plex, Zoom, Google Meet.",
      min_specs: {
        ram_gb: 8,
        storage_gb: 256,
        gpu_type: "integrated",
        min_cpu_score: 3000,
      },
    },
    {
      name: "Writing & Study",
      description: "Google Docs, Word, Notion, PDFs.",
      min_specs: {
        ram_gb: 8,
        storage_gb: 256,
        gpu_type: "integrated",
        min_cpu_score: 3000,
      },
    },
    {
      name: "Casual 2D Games",
      description: "Browser games, Stardew Valley, Minecraft, Sims.",
      min_specs: {
        ram_gb: 8,
        storage_gb: 256,
        gpu_type: "integrated",
        min_cpu_score: 5000,
      },
    },

    // ── PROFESSIONAL ─────────────────────────────────────────────────────────

    {
      name: "Office Productivity",
      description: "Word, Excel, PowerPoint, Outlook.",
      min_specs: {
        ram_gb: 8,
        storage_gb: 256,
        gpu_type: "integrated",
        min_cpu_score: 6000,
        os_requirement: "win",
      },
    },
    {
      name: "Finance",
      description: "Excel macros, Power BI, Bloomberg, SAP.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 256,
        gpu_type: "integrated",
        min_cpu_score: 9000,
        os_requirement: "win",
      },
    },
    {
      name: "Research & Analytics",
      description: "SPSS, R, Python notebooks, Tableau.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 10000,
      },
    },
    {
      name: "Remote Work & VPN",
      description: "Citrix, VPN, remote desktop, VDI.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 256,
        gpu_type: "integrated",
        min_cpu_score: 7000,
        os_requirement: "win",
      },
    },
    {
      name: "ERP Systems",
      description: "SAP, Oracle ERP, Microsoft Dynamics.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 256,
        gpu_type: "integrated",
        min_cpu_score: 10000,
        os_requirement: "win",
      },
    },

    // ── CREATIVE ─────────────────────────────────────────────────────────────

    {
      name: "Photo & Design",
      description: "Lightroom, Photoshop, Figma, XD.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 12000,
      },
    },
    {
      name: "Video Editing",
      description: "Premiere Pro, DaVinci Resolve, Final Cut.",
      min_specs: {
        ram_gb: 16,
        cpu_cores: 6,
        storage_gb: 512,
        gpu_type: "discrete",
        vram_gb: 4,
        min_cpu_score: 17000,
        min_gpu_score: 8500,
      },
    },
    {
      name: "Music Production",
      description: "Ableton, Logic Pro, FL Studio, Pro Tools.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 11000,
      },
    },
    {
      name: "Content Creation",
      description: "OBS, Audacity, YouTube 4K, podcast.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 13000,
        min_gpu_score: 5000,
      },
    },
    {
      name: "VFX & 3D Rendering",
      description: "Blender, Cinema 4D, Houdini, After Effects.",
      min_specs: {
        ram_gb: 32,
        cpu_cores: 8,
        storage_gb: 512,
        gpu_type: "discrete",
        vram_gb: 6,
        min_cpu_score: 22000,
        min_gpu_score: 12000,
        os_requirement: "win",
      },
    },

    // ── SOFTWARE / TECH ───────────────────────────────────────────────────────

    {
      name: "Web Development",
      description: "VS Code, Node.js, React, Docker.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 11000,
      },
    },
    {
      name: "Data Science",
      description: "Jupyter, Pandas, Spark, SQL, Tableau.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 13000,
      },
    },
    {
      name: "Cybersecurity",
      description: "Kali Linux, Burp Suite, Wireshark, VMs.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 13000,
        os_requirement: "win",
      },
    },
    {
      name: "Machine Learning",
      description: "PyTorch, TensorFlow, CUDA, LLM training.",
      min_specs: {
        ram_gb: 32,
        cpu_cores: 8,
        storage_gb: 512,
        gpu_type: "discrete",
        vram_gb: 8,
        min_cpu_score: 22000,
        min_gpu_score: 12000,
      },
    },
    {
      name: "Game Development",
      description: "Unity, Unreal Engine, game builds.",
      min_specs: {
        ram_gb: 32,
        cpu_cores: 8,
        storage_gb: 512,
        gpu_type: "discrete",
        vram_gb: 6,
        min_cpu_score: 20000,
        min_gpu_score: 10000,
        os_requirement: "win",
      },
    },

    // ── ENGINEERING / SCIENCE ─────────────────────────────────────────────────

    {
      name: "3D CAD / Modeling",
      description: "SolidWorks, AutoCAD, Fusion 360.",
      min_specs: {
        ram_gb: 16,
        cpu_cores: 6,
        storage_gb: 512,
        gpu_type: "discrete",
        vram_gb: 4,
        min_cpu_score: 17000,
        min_gpu_score: 8500,
        os_requirement: "win",
      },
    },
    {
      name: "Architecture & BIM",
      description: "Revit, SketchUp, Rhino 3D, Lumion.",
      min_specs: {
        ram_gb: 32,
        cpu_cores: 8,
        storage_gb: 512,
        gpu_type: "discrete",
        vram_gb: 6,
        min_cpu_score: 22000,
        min_gpu_score: 12000,
        os_requirement: "win",
      },
    },
    {
      name: "Scientific Simulation",
      description: "MATLAB, Ansys, GROMACS, CFD/FEA.",
      min_specs: {
        ram_gb: 32,
        cpu_cores: 8,
        storage_gb: 512,
        gpu_type: "discrete",
        vram_gb: 4,
        min_cpu_score: 22000,
        min_gpu_score: 8000,
        os_requirement: "win",
      },
    },
    {
      name: "GIS & Mapping",
      description: "ArcGIS, QGIS, Google Earth Engine.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 13000,
        min_gpu_score: 5000,
        os_requirement: "win",
      },
    },
    {
      name: "Electrical / EDA",
      description: "Altium, KiCad, Cadence, MATLAB Simulink.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 512,
        gpu_type: "integrated",
        min_cpu_score: 13000,
        min_gpu_score: 4000,
        os_requirement: "win",
      },
    },

    // ── GAMING ────────────────────────────────────────────────────────────────

    {
      name: "Casual Gaming",
      description: "Stardew Valley, Hades, Minecraft, Sims.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 256,
        gpu_type: "discrete",
        vram_gb: 4,
        min_cpu_score: 8000,
        min_gpu_score: 6000,
        os_requirement: "win",
      },
    },
    {
      name: "Esports",
      description: "Competitive FPS, 144–360Hz, low latency.",
      min_specs: {
        ram_gb: 16,
        storage_gb: 256,
        gpu_type: "discrete",
        vram_gb: 6,
        min_cpu_score: 13000,
        min_gpu_score: 10000,
        os_requirement: "win",
      },
    },
    {
      name: "AAA Gaming",
      description: "Cyberpunk 2077, GTA VI, Elden Ring.",
      min_specs: {
        ram_gb: 16,
        cpu_cores: 6,
        storage_gb: 512,
        gpu_type: "discrete",
        vram_gb: 8,
        min_cpu_score: 22000,
        min_gpu_score: 15000,
        os_requirement: "win",
      },
    },
    {
      name: "VR Gaming",
      description: "Meta Quest Link, SteamVR, Half-Life: Alyx.",
      min_specs: {
        ram_gb: 16,
        cpu_cores: 8,
        storage_gb: 512,
        gpu_type: "discrete",
        vram_gb: 8,
        min_cpu_score: 28000,
        min_gpu_score: 18000,
        os_requirement: "win",
      },
    },
  ]);
