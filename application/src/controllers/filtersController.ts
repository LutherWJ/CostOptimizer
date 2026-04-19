import type { Context } from "hono";
import Filters from "../views/Filters";

export class FiltersController {
  async getFilters(c: Context) {
    return c.html(Filters());
  }
}
