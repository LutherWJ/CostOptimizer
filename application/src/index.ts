import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getHome } from "./controllers/homeController";
import { workloadsController } from "./controllers/workloadsController";
import { filtersController } from "./controllers/filtersController";
import { getRecommendationsController } from "./controllers/recommendationController";
import { logger } from "hono/logger";

const app = new Hono();

app.use("/public/*", serveStatic({ root: "./" }));
app.use("*", logger());

app.get("/", getHome);
app.get("/workloads", workloadsController);
app.get("/filters", filtersController);
app.get("/recommend", getRecommendationsController);

const server = {
  port: process.env.http_server_port || 3000,
  fetch: app.fetch,
};

export default server;
