import type { Context } from "hono";
import type { RecommendationService } from "../services/RecommendationService";
import Recommendations from "../views/Recommendations";

export class RecommendationController {
  constructor(private service: RecommendationService) {}

  async getRecommendations(c: Context) {
    const workloads = c.req.query("workloads") || "";
    const software  = c.req.query("software")  || "";
    const budget    = c.req.query("budget")    || "any";
    const size      = c.req.query("size")      || "any";

    const workloadIds = workloads
      ? workloads.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    // Build the "Edit preferences" back-link
    const filtersUrl =
      `/filters?workloads=${encodeURIComponent(workloads)}` +
      (software ? `&software=${encodeURIComponent(software)}` : "") +
      (budget ? `&budget=${encodeURIComponent(budget)}` : "") +
      (size ? `&size=${encodeURIComponent(size)}` : "");

    try {
      const laptops = await this.service.getRecommendations({ workloads, software, budget, size });

      return c.html(
        Recommendations({ laptops, workloadIds, budget, size, filtersUrl }),
      );
    } catch (err) {
      console.error("Recommendations error:", (err as Error).message);
      return c.html(
        Recommendations({ laptops: [], workloadIds, budget, size, filtersUrl }),
      );
    }
  }
}
