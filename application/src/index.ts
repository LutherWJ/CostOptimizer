import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getHome } from "./controllers/homeController";
import { workloadsController } from "./controllers/workloadsController";
import { filtersController } from "./controllers/filtersController";
import { getRecommendationsController } from "./controllers/recommendationController";
import { supportChatController } from "./controllers/supportChatController";
import { logger } from "hono/logger";

const app = new Hono();
app.use("*", logger());

const publicRoot = `${import.meta.dir}/..`;
app.use("/public/*", serveStatic({ root: publicRoot }));
app.use("/images/*", serveStatic({ root: `${import.meta.dir}/images` }));

app.get("/", getHome);
app.get("/workloads", workloadsController);
app.get("/filters", filtersController);
app.get("/recommend", getRecommendationsController);
app.post("/api/support/chat", supportChatController);

const server = {
  port: process.env.http_server_port || 3000,
  fetch: app.fetch,
};

export default server;
