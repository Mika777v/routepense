import type { ApiError, Route } from "@routepense/shared";
import { Router } from "express";
import { parseRouteInput } from "./parse-route-input";
import type { RouteRepository } from "./route-repository";

const notFound: ApiError = { error: "ルートが見つかりません" };

/** /api/routes の API。ルートの一覧・登録・編集・削除 */
export function routeRouter(repo: RouteRepository, userId: string): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const body: Route[] = repo.list(userId);
    res.json(body);
  });

  router.post("/", (req, res) => {
    const parsed = parseRouteInput(req.body);
    if (!parsed.ok) {
      const body: ApiError = { error: "入力に誤りがあります", fieldErrors: parsed.errors };
      res.status(400).json(body);
      return;
    }
    res.status(201).json(repo.create(userId, parsed.value));
  });

  router.put("/:id", (req, res) => {
    const parsed = parseRouteInput(req.body);
    if (!parsed.ok) {
      const body: ApiError = { error: "入力に誤りがあります", fieldErrors: parsed.errors };
      res.status(400).json(body);
      return;
    }
    const updated = repo.update(userId, req.params.id, parsed.value);
    if (!updated) {
      res.status(404).json(notFound);
      return;
    }
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    if (!repo.delete(userId, req.params.id)) {
      res.status(404).json(notFound);
      return;
    }
    res.status(204).end();
  });

  return router;
}
