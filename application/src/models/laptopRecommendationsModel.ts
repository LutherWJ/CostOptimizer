export interface LaptopRecommendation {
  recommendation_id: string;
  sku_id: string;
  manufacturer: string;
  line_name: string;
  marketing_name?: string;
  sku_number: string;
  hardware_specs: {
    cpu_family: string;
    gpu_model: string;
    ram_gb: number;
    storage_gb: number;
    cpu_cores: number;
    gpu_type: string;
    gpu_vram_gb: number;
    screen_size_in: number;
    weight_kg: number;
    battery_hours: number;
  };
  suitable_workloads: string[];
  compatible_software_keys?: string[];
  compatible_software_names?: string[];
  current_price: number;
  best_vendor: string;
  purchase_url: string;
  is_refurbished: boolean;
  cpu_score: number | null;
  gpu_score: number | null;
  value_score: number | null;
}
