import type { Context } from "hono";
import type { RecommendationService } from "../services/RecommendationService";
import Recommendations from "../views/Recommendations";

function clampInt(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.trunc(n)));
}

export class RecommendationController {
  constructor(private service: RecommendationService) {}

  async getRecommendations(c: Context) {
    const workloads = c.req.query("workloads") || "";
    const software = c.req.query("software") || "";
    const budget = c.req.query("budget") || "any";
    const size = c.req.query("size") || "any";

    const bnRaw = c.req.query("bn") || "0";
    let budgetNudgeSteps = clampInt(Number.parseInt(bnRaw, 10) || 0, 0, 5);
    if (budget === "any" || budget === "2500-99999") budgetNudgeSteps = 0;

    const workloadIds = workloads
      ? workloads.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // Build the "Edit preferences" back-link.
    const filtersUrl =
      `/filters?workloads=${encodeURIComponent(workloads)}` +
      (software ? `&software=${encodeURIComponent(software)}` : "") +
      (budget ? `&budget=${encodeURIComponent(budget)}` : "") +
      (size ? `&size=${encodeURIComponent(size)}` : "") +
      (budgetNudgeSteps > 0 ? `&bn=${encodeURIComponent(String(budgetNudgeSteps))}` : "");

    try {
      const laptops = await this.service.getRecommendations({
        workloads,
        software,
        budget,
        size,
        budgetNudgeSteps,
      });

      return c.html(
        Recommendations({ laptops, workloadIds, budget, size, budgetNudgeSteps, filtersUrl }),
      );
    } catch (err) {
      console.error("Recommendations error:", (err as Error).message);
      return c.html(
        Recommendations({ laptops: [], workloadIds, budget, size, budgetNudgeSteps, filtersUrl }),
      );
    }
  }
}

