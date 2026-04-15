// src/controllers/recommendationController.ts
import type { Context } from "hono";
import { getRecommendations } from "../models/laptopRecommendationsModel";

export async function getRecommendationsController(c: Context) {
  try {
    const recommendations = await getRecommendations();

    return c.json(recommendations);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
}