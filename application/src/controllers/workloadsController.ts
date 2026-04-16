import type { Context } from "hono";
import Workloads from "../views/Workloads";

export const workloadsController = (c: Context) => {
  return c.html(Workloads());
};
