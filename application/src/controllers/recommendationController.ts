import type { Context } from "hono";
import { getRecommendations } from "../models/laptopRecommendationsModel";
import Recommendations from "../views/Recommendations";

export async function getRecommendationsController(c: Context) {
  const workloads = c.req.query("workloads") || "";
  const software  = c.req.query("software")  || "";
  const budget    = c.req.query("budget")    || "any";
  const size      = c.req.query("size")      || "any";
  const bnRaw     = c.req.query("bn")        || "0";
  let budgetNudgeSteps = Math.max(0, Math.min(5, Number.parseInt(bnRaw, 10) || 0));
  if (budget === "any" || budget === "2500-99999") budgetNudgeSteps = 0;

  const workloadIds = workloads
    ? workloads.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  // Build the "Edit preferences" back-link
  const filtersUrl =
    `/filters?workloads=${encodeURIComponent(workloads)}` +
    (software ? `&software=${encodeURIComponent(software)}` : "") +
    (budget ? `&budget=${encodeURIComponent(budget)}` : "") +
    (size ? `&size=${encodeURIComponent(size)}` : "") +
    (budgetNudgeSteps > 0 ? `&bn=${encodeURIComponent(String(budgetNudgeSteps))}` : "");

  try {
    const laptops = await getRecommendations({ workloads, software, budget, size, budgetNudgeSteps });

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
