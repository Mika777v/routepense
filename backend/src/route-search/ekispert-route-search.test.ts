import { describe, expect, it } from "vitest";
import { EkispertFreeRouteSearch, resourceUri, type FetchLike } from "./ekispert-route-search";

const RESULT_URL = "https://roote.ekispert.net/result?arv=B&dep=A";

/** 外部の API を呼ばずに、決まった応答を返す fetch。呼ばれた URL を残す */
function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: string[] = [];
  const fn: FetchLike = (input) => {
    calls.push(input);
    return Promise.resolve(respond());
  };
  return { fn, calls };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("EkispertFreeRouteSearch", () => {
  it("キーと駅名を付けて呼び、ResourceURI を経路結果の URL として返す", async () => {
    const fetch = fakeFetch(() => json({ ResultSet: { apiVersion: "1.27.0.0", ResourceURI: RESULT_URL } }));
    const search = new EkispertFreeRouteSearch("test-key", fetch.fn);

    expect(await search.search({ from: "東京", to: "新宿" })).toEqual({ kind: "found", url: RESULT_URL });

    const called = new URL(fetch.calls[0] ?? "");
    expect(called.origin + called.pathname).toBe("https://api.ekispert.jp/v1/json/search/course/light");
    expect(Object.fromEntries(called.searchParams)).toEqual({ key: "test-key", from: "東京", to: "新宿" });
  });

  it("400 は経路が見つからない、として返す", async () => {
    const search = new EkispertFreeRouteSearch("k", fakeFetch(() => json({ ResultSet: {} }, 400)).fn);
    expect(await search.search({ from: "A", to: "B" })).toEqual({ kind: "notFound" });
  });

  it("403 と 500 は失敗として、理由を付けて返す", async () => {
    const forbidden = new EkispertFreeRouteSearch("k", fakeFetch(() => json({}, 403)).fn);
    expect(await forbidden.search({ from: "A", to: "B" })).toMatchObject({ kind: "failed", reason: expect.stringContaining("キー") });

    const broken = new EkispertFreeRouteSearch("k", fakeFetch(() => json({}, 500)).fn);
    expect(await broken.search({ from: "A", to: "B" })).toMatchObject({ kind: "failed", reason: expect.stringContaining("500") });
  });

  it("つながらない・JSON でない応答も、例外にせず失敗として返す", async () => {
    const offline = new EkispertFreeRouteSearch("k", () => Promise.reject(new TypeError("fetch failed")));
    expect(await offline.search({ from: "A", to: "B" })).toMatchObject({ kind: "failed" });

    const html = new EkispertFreeRouteSearch("k", fakeFetch(() => new Response("<html>")).fn);
    expect(await html.search({ from: "A", to: "B" })).toMatchObject({ kind: "failed" });
  });
});

describe("resourceUri", () => {
  it("http(s) の URL だけを取り出す", () => {
    expect(resourceUri({ ResultSet: { ResourceURI: RESULT_URL } })).toBe(RESULT_URL);
    expect(resourceUri({ ResultSet: { ResourceURI: "javascript:alert(1)" } })).toBeUndefined();
    expect(resourceUri({ ResultSet: { ResourceURI: 1 } })).toBeUndefined();
    expect(resourceUri({ ResultSet: null })).toBeUndefined();
    expect(resourceUri(null)).toBeUndefined();
  });
});
