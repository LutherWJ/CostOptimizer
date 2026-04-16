import type { Context } from "hono";
import { getRecommendations } from "../models/laptopRecommendationsModel";
import Recommendations from "../views/Recommendations";

export async function getRecommendationsController(c: Context) {
  const workloads = c.req.query("workloads") || "";
  const budget    = c.req.query("budget")    || "any";
  const size      = c.req.query("size")      || "any";

  const workloadIds = workloads
    ? workloads.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  // Build the "Edit preferences" back-link
  const filtersUrl = `/filters?workloads=${encodeURIComponent(workloads)}`;

  try {
    const laptops = await getRecommendations({ workloads, budget, size });

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
