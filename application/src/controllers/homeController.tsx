import type { Context } from "hono";
import Home from "../views/Home";

export const getHome = (c: Context) => {
  return c.html(Home());
};