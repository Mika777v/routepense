import type { HealthResponse } from "@routepense/shared";
import express from "express";

// アプリの組み立て（ルーティングなど）と、ポートで待ち受ける処理を分けておく。
// こうするとテストからアプリだけを作って、好きなポートで動かせる。
export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = { status: "ok", time: new Date().toISOString() };
    res.json(body);
  });

  return app;
}
