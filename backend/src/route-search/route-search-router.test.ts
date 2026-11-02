import type { ApiError, RouteSearchResponse, RouteSearchStatus } from "@routepense/shared";
import { afterEach, describe, expect, it } from "vitest";
import { startTestServer } from "../test-server";
import type { RouteSearch, RouteSearchOutcome, RouteSearchQuery } from "./route-search";

/** 決まった結果を返す経路検索。受け取った条件を残す（テスト用の差し替え） */
class StubRouteSearch implements RouteSearch {
  readonly available = true;
  readonly queries: RouteSearchQuery[] = [];
  constructor(private readonly outcome: RouteSearchOutcome) {}
  search(query: RouteSearchQuery): Promise<RouteSearchOutcome> {
    this.queries.push(query);
    return Promise.resolve(this.outcome);
  }
}

describe("/api/route-search", () => {
  let server: ReturnType<typeof startTestServer> | undefined;

  afterEach(() => {
    server?.close();
  });

  function start(routeSearch?: RouteSearch) {
    server = startTestServer(routeSearch);
    return (path: string) => fetch(`${server?.baseUrl}/api/route-search${path}`);
  }

  it("キーが無いとき: status は使えないと返し、検索は 503", async () => {
    const get = start();
    expect((await (await get("/status")).json()) as RouteSearchStatus).toEqual({ available: false });

    const res = await get(`?from=${encodeURIComponent("東京")}&to=${encodeURIComponent("新宿")}`);
    expect(res.status).toBe(503);
    expect(((await res.json()) as ApiError).error).toContain("キー");
  });

  it("見つかったときは 200 で URL を返し、実装には確かめた後の駅名を渡す", async () => {
    const stub = new StubRouteSearch({ kind: "found", url: "https://example.com/r" });
    const get = start(stub);
    expect((await (await get("/status")).json()) as RouteSearchStatus).toEqual({ available: true });

    const res = await get(`?from=${encodeURIComponent(" 東京 ")}&to=${encodeURIComponent("新宿")}`);
    expect(res.status).toBe(200);
    expect((await res.json()) as RouteSearchResponse).toEqual({ url: "https://example.com/r" });
    expect(stub.queries).toEqual([{ from: "東京", to: "新宿" }]);
  });

  it("運賃が分かる実装なら、運賃も返す", async () => {
    const get = start(new StubRouteSearch({ kind: "found", url: "https://example.com/r", fare: 220 }));
    expect(await (await get("?from=A&to=B")).json()).toEqual({ url: "https://example.com/r", fare: 220 });
  });

  it("入力に誤りがあると 400 で、実装は呼ばない", async () => {
    const stub = new StubRouteSearch({ kind: "notFound" });
    const get = start(stub);
    const res = await get("?from=A");
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiError).fieldErrors?.map((e) => e.field)).toEqual(["to"]);
    expect(stub.queries).toEqual([]);
  });

  it("見つからないときは 404、外部の失敗は 502", async () => {
    expect((await start(new StubRouteSearch({ kind: "notFound" }))("?from=A&to=B")).status).toBe(404);
    server?.close();
    const res = await start(new StubRouteSearch({ kind: "failed", reason: "test" }))("?from=A&to=B");
    expect(res.status).toBe(502);
  });
});
