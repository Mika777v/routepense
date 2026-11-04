import { readFileSync } from "node:fs";
import type { Router } from "express";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { apiRouters, createApp, type AppDeps } from "./app";

// docs/api/openapi.yaml（人が読むための仕様書）に書いた「メソッド＋パス」と、
// backend が実際に受け付ける「メソッド＋パス」が一致するかを確かめる（ADR-0003）。
// 本文の形は照合しない（正は shared/ の型で、型チェックが画面と backend の食い違いを見つける）。

/** OpenAPI のパスの1つの下に書ける、メソッドのキー */
const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

type OpenApiDocument = { paths: Record<string, Record<string, unknown>> };

/** openapi.yaml から「GET /api/routes/{id}」の形の一覧を作る */
function documentedEndpoints(): string[] {
  const text = readFileSync(new URL("../../docs/api/openapi.yaml", import.meta.url), "utf8");
  const doc = parse(text) as OpenApiDocument;
  return Object.entries(doc.paths).flatMap(([path, item]) =>
    Object.keys(item)
      .filter((key) => HTTP_METHODS.includes(key))
      .map((method) => `${method.toUpperCase()} ${path}`),
  );
}

/** Express のパス（/:date）を OpenAPI の書き方（/{date}）に変え、付けた場所のパスとつなぐ */
function toOpenApiPath(mountPath: string, routePath: string): string {
  const joined = routePath === "/" ? mountPath : mountPath + routePath;
  return joined.replace(/:(\w+)/g, "{$1}");
}

/** Router に登録した「メソッド＋パス」の一覧 */
function routerEndpoints(mountPath: string, router: Router): string[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route;
    if (route === undefined) return []; // Router の中の app.use（ミドルウェア）は API ではない
    const methods = new Set(route.stack.map((handler) => handler.method.toUpperCase()));
    return [...methods].map((method) => `${method} ${toOpenApiPath(mountPath, route.path)}`);
  });
}

// 一覧を作るだけで、API は呼ばない。中身の無い依存で足りる
const deps = {} as AppDeps;

function implementedEndpoints(): string[] {
  return apiRouters(deps).flatMap(({ path, router }) => routerEndpoints(path, router));
}

describe("docs/api/openapi.yaml と backend の API の一致", () => {
  it("backend が受け付ける「メソッド＋パス」が、仕様書にすべて書かれている（多くも少なくもない）", () => {
    // 並べてから比べると、食い違ったときにどれが片方にだけあるかが差分で分かる
    expect(documentedEndpoints().sort()).toEqual(implementedEndpoints().sort());
  });

  it("API は apiRouters にだけ足している（app.get などで直接足すと、上のテストで見つけられないため）", () => {
    const app = createApp(deps);
    const direct = app.router.stack.filter((layer) => layer.route !== undefined).map((layer) => layer.route?.path);
    expect(direct).toEqual([]);
    const mounted = app.router.stack.filter((layer) => layer.name === "router");
    expect(mounted).toHaveLength(apiRouters(deps).length);
  });

  it("一覧の作り方の確かめ: 15 個の API がある", () => {
    expect(implementedEndpoints()).toHaveLength(15);
    expect(implementedEndpoints()).toContain("DELETE /api/daily-records/{date}/extra-trips/{tripId}");
  });
});
