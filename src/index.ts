import { Hono } from "hono";
import { getHome } from "./controllers/homeController";

const app = new Hono();

app.get("/", (c) => getHome(c));

const server = {
  port: process.env.http_server_port || 8080,
  fetch: app.fetch,
};

export default server;
