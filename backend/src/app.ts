import type { ApiError, HealthResponse } from "@routepense/shared";
import express, { type ErrorRequestHandler } from "express";
import { dailyRecordRouter } from "./daily-records/daily-record-router";
import type { DailyRecordRepository } from "./daily-records/daily-record-repository";
import type { RouteRepository } from "./routes/route-repository";
import { routeRouter } from "./routes/route-router";

export type AppDeps = {
  routes: RouteRepository;
  dailyRecords: DailyRecordRepository;
  /** 記録の持ち主。認証はスコープ外なので、今は固定値を渡す */
  userId: string;
};

// アプリの組み立て（ルーティングなど）と、ポートで待ち受ける処理を分けておく。
// こうするとテストからアプリだけを作って、好きなポートで動かせる。
// DB は引数で受け取るので、テストでは使い捨ての DB を渡せる。
export function createApp(deps: AppDeps) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = { status: "ok", time: new Date().toISOString() };
    res.json(body);
  });

  app.use("/api/routes", routeRouter(deps.routes, deps.userId));
  app.use("/api/daily-records", dailyRecordRouter(deps.dailyRecords, deps.routes, deps.userId));

  // JSON として読めない本文などは、ここで 400 にする。それ以外の想定外のエラーは 500
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === "number" && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err);
    const body: ApiError = { error: status === 500 ? "サーバーでエラーが起きました" : "リクエストを読み取れません" };
    res.status(status).json(body);
  };
  app.use(onError);

  return app;
}
