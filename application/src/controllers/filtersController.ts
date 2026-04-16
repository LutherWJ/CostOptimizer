import type { Context } from "hono";
import Filters from "../views/Filters";

export const filtersController = (c: Context) => {
  return c.html(Filters());
};
