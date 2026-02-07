import express from "express";

const app = express();
const port = 8080;

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Service is running" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});
