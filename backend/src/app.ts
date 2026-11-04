import type { ApiError, HealthResponse } from "@routepense/shared";
import express, { Router, type ErrorRequestHandler } from "express";
import { dailyRecordRouter } from "./daily-records/daily-record-router";
import type { DailyRecordRepository } from "./daily-records/daily-record-repository";
import type { RouteSearch } from "./route-search/route-search";
import { routeSearchRouter } from "./route-search/route-search-router";
import type { RouteRepository } from "./routes/route-repository";
import { routeRouter } from "./routes/route-router";

export type AppDeps = {
  routes: RouteRepository;
  dailyRecords: DailyRecordRepository;
  /** 経路検索。キーが無い環境では「使えない」実装を渡す */
  routeSearch: RouteSearch;
  /** 記録の持ち主。認証はスコープ外なので、今は固定値を渡す */
  userId: string;
};

function healthRouter(): Router {
  const router = Router();
  router.get("/", (_req, res) => {
    const body: HealthResponse = { status: "ok", time: new Date().toISOString() };
    res.json(body);
  });
  return router;
}

/**
 * API の Router と、それを付けるパスの一覧。
 * API は必ずここに足す（app.get などで直接足さない）。
 * openapi.test.ts がこの一覧から「メソッド＋パス」を集め、docs/api/openapi.yaml と照らし合わせる。
 * Express 5 は app.use で付けたパスを後から取り出せないので、付けるパスをデータとして持っておく。
 */
export function apiRouters(deps: AppDeps): { path: string; router: Router }[] {
  return [
    { path: "/api/health", router: healthRouter() },
    { path: "/api/routes", router: routeRouter(deps.routes, deps.userId) },
    { path: "/api/daily-records", router: dailyRecordRouter(deps.dailyRecords, deps.routes, deps.userId) },
    { path: "/api/route-search", router: routeSearchRouter(deps.routeSearch) },
  ];
}

// アプリの組み立て（ルーティングなど）と、ポートで待ち受ける処理を分けておく。
// こうするとテストからアプリだけを作って、好きなポートで動かせる。
// DB は引数で受け取るので、テストでは使い捨ての DB を渡せる。
export function createApp(deps: AppDeps) {
  const app = express();
  app.use(express.json());

  for (const { path, router } of apiRouters(deps)) {
    app.use(path, router);
  }

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
