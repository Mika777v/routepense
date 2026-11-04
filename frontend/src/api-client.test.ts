import { afterEach, describe, expect, it, vi } from "vitest";
import { CONNECTION_ERROR, request } from "./api-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

function respond(body: string | null, status: number) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));
}

describe("request: 失敗の文", () => {
  it("fetch そのものが失敗したら、接続できない旨を返す", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await request("/api/routes")).toEqual({ ok: false, error: { error: CONNECTION_ERROR } });
  });

  it("本文が JSON でない 502（backend が止まっていて Vite の proxy が返す）は、接続できない旨を返す", async () => {
    respond("", 502);
    expect(await request("/api/routes")).toEqual({ ok: false, error: { error: CONNECTION_ERROR } });
  });

  it("503・504 で本文が無いときも、接続できない旨を返す", async () => {
    respond(null, 503);
    expect(await request("/api/routes")).toEqual({ ok: false, error: { error: CONNECTION_ERROR } });
    respond(null, 504);
    expect(await request("/api/routes")).toEqual({ ok: false, error: { error: CONNECTION_ERROR } });
  });

  it("backend の 502（経路検索の失敗）は、本文の ApiError をそのまま返す", async () => {
    const error = { error: "経路検索に失敗しました: 駅すぱあと API につながりませんでした" };
    respond(JSON.stringify(error), 502);
    expect(await request("/api/route-search")).toEqual({ ok: false, error });
  });

  it("本文が JSON でない、ほかのステータスは、ステータスを添えた文を返す", async () => {
    respond("Internal Server Error", 500);
    expect(await request("/api/routes")).toEqual({ ok: false, error: { error: "エラーが起きました（HTTP 500）" } });
  });
});
