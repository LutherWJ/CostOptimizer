import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { HomeController } from "./controllers/homeController";
import { WorkloadsController } from "./controllers/workloadsController";
import { FiltersController } from "./controllers/filtersController";
import { RecommendationController } from "./controllers/recommendationController";
import { RecommendationService } from "./services/RecommendationService";
import { RecommendationRepository } from "./repositories/RecommendationRepository";
import { supportChatController } from "./controllers/supportChatController";
import { logger } from "hono/logger";

const app = new Hono();
app.use("*", logger());

// Dependency Injection Setup
const recommendationRepo = new RecommendationRepository();
const recommendationService = new RecommendationService(recommendationRepo);
const recommendationController = new RecommendationController(recommendationService);

const homeController = new HomeController();
const workloadsController = new WorkloadsController();
const filtersController = new FiltersController();

const publicRoot = `${import.meta.dir}/..`;
app.use("/public/*", serveStatic({ root: publicRoot }));
app.use("/images/*", serveStatic({ root: import.meta.dir }));

app.get("/", (c) => homeController.getHome(c));
app.get("/workloads", (c) => workloadsController.getWorkloads(c));
app.get("/filters", (c) => filtersController.getFilters(c));
app.get("/recommend", (c) => recommendationController.getRecommendations(c));
app.post("/api/support/chat", supportChatController);

const server = {
  port: process.env.http_server_port || 3000,
  fetch: app.fetch,
};

export default server;
