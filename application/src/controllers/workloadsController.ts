import type { Context } from "hono";
import Workloads from "../views/Workloads";

export class WorkloadsController {
  async getWorkloads(c: Context) {
    return c.html(Workloads());
  }
}
