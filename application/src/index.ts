import { Hono } from "hono";
import { getHome } from "./controllers/homeController";
import { getRecommendationsController } from "./controllers/recommendationController";

const app = new Hono();

app.get("/", getHome);
app.get("/recommend", getRecommendationsController);

const server = {
  port: process.env.http_server_port || 3000,
  fetch: app.fetch,
};

export default server;