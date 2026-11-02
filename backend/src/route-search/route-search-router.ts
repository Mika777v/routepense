import { assertNever, type ApiError, type RouteSearchResponse, type RouteSearchStatus } from "@routepense/shared";
import { Router } from "express";
import { parseRouteSearchQuery } from "./parse-route-search-query";
import type { RouteSearch } from "./route-search";

/** /api/route-search の API。どの実装が来ても、同じ形の応答を返す */
export function routeSearchRouter(routeSearch: RouteSearch): Router {
  const router = Router();

  router.get("/status", (_req, res) => {
    const body: RouteSearchStatus = { available: routeSearch.available };
    res.json(body);
  });

  router.get("/", async (req, res) => {
    const parsed = parseRouteSearchQuery(req.query);
    if (!parsed.ok) {
      const body: ApiError = { error: "入力に誤りがあります", fieldErrors: parsed.errors };
      res.status(400).json(body);
      return;
    }

    const outcome = await routeSearch.search(parsed.value);
    switch (outcome.kind) {
      case "found": {
        const body: RouteSearchResponse =
          outcome.fare === undefined ? { url: outcome.url } : { url: outcome.url, fare: outcome.fare };
        res.json(body);
        return;
      }
      case "notFound":
        res.status(404).json({ error: "経路が見つかりませんでした。駅名を確かめてください" } satisfies ApiError);
        return;
      case "unavailable":
        res.status(503).json({ error: "経路検索は使えません（API のキーが設定されていません）" } satisfies ApiError);
        return;
      case "failed":
        console.error(`経路検索に失敗: ${outcome.reason}`);
        res.status(502).json({ error: `経路検索に失敗しました: ${outcome.reason}` } satisfies ApiError);
        return;
      default:
        // kind を足して case を書き忘れると、ここが型エラーになる
        assertNever(outcome);
    }
  });

  return router;
}
