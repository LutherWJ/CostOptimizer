import type { Context } from "hono";
import Home from "../views/Home";

export class HomeController {
  async getHome(c: Context) {
    return c.html(Home());
  }
}
