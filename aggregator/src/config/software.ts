export interface SoftwareRequirementDefinition {
  software_key: string;
  software_name: string;
  description: string;
  required_workloads: string[];
  os_requirement?: "any" | "win" | "mac";
  source_url?: string;
  last_verified?: string; // YYYY-MM-DD
}

// These are proxy rules: "software compatibility" is defined as meeting workload requirements.
// Update these mappings as you validate real vendor/school requirements.
export const SOFTWARE_REQUIREMENTS: readonly SoftwareRequirementDefinition[] =
  Object.freeze([
    {
      software_key: "examsoft",
      software_name: "ExamSoft (Examplify)",
      description: "High-stakes exam software (proxy: Office Productivity).",
      required_workloads: ["Office Productivity"],
      os_requirement: "any",
    },
    {
      software_key: "respondus",
      software_name: "Respondus LockDown Browser",
      description: "Test-taking browser + proctoring (proxy: Office Productivity).",
      required_workloads: ["Office Productivity"],
      os_requirement: "any",
    },
    {
      software_key: "m365",
      software_name: "Microsoft 365 (Word/Excel/PowerPoint)",
      description: "Office apps and OneDrive (proxy: Office Productivity).",
      required_workloads: ["Office Productivity"],
      os_requirement: "any",
    },
    {
      software_key: "solidworks",
      software_name: "SolidWorks",
      description: "3D CAD workload proxy.",
      required_workloads: ["3D CAD / Modeling"],
      os_requirement: "win",
    },
    {
      software_key: "autocad",
      software_name: "AutoCAD",
      description: "CAD workload proxy.",
      required_workloads: ["3D CAD / Modeling"],
      os_requirement: "any",
    },
    {
      software_key: "revit",
      software_name: "Autodesk Revit",
      description: "Architecture/BIM workload proxy.",
      required_workloads: ["Architecture & BIM"],
      os_requirement: "win",
    },
    {
      software_key: "arcgispro",
      software_name: "ArcGIS Pro",
      description: "GIS workload proxy.",
      required_workloads: ["GIS & Mapping"],
      os_requirement: "win",
    },
    {
      software_key: "matlab",
      software_name: "MATLAB",
      description: "Scientific simulation workload proxy.",
      required_workloads: ["Scientific Simulation"],
      os_requirement: "any",
    },
    {
      software_key: "adobecc",
      software_name: "Adobe Creative Cloud (Photoshop/Premiere)",
      description: "Creative workload proxy (design + content).",
      required_workloads: ["Photo & Design"],
      os_requirement: "any",
    },
    {
      software_key: "docker",
      software_name: "Docker Desktop",
      description: "Development workload proxy.",
      required_workloads: ["Web Development"],
      os_requirement: "any",
    },
  ]);

