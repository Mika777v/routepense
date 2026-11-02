import { afterEach, describe, expect, it, vi } from "vitest";
import { getRouteSearchStatus, searchRoute } from "./route-search-api";

/** fetch を、決まった応答を返す偽物に差し替える */
function stubFetch(response: Response) {
  const fake = vi.fn(async () => response);
  vi.stubGlobal("fetch", fake);
  return fake;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("route-search-api", () => {
  it("使えるか: /status の応答をそのまま返す", async () => {
    const fake = stubFetch(json(200, { available: false }));
    expect(await getRouteSearchStatus()).toEqual({ ok: true, value: { available: false } });
    expect(fake).toHaveBeenCalledWith("/api/route-search/status", expect.anything());
  });

  it("検索: 駅名をクエリ文字列に符号化して送り、URL を返す", async () => {
    const url = "https://roote.ekispert.net/result?arv=%E6%9D%B1%E4%BA%AC";
    const fake = stubFetch(json(200, { url }));
    expect(await searchRoute("中野", "東京")).toEqual({ ok: true, value: { url } });
    const [requested] = fake.mock.calls[0] as unknown as [string];
    const params = new URL(requested, "http://localhost").searchParams;
    expect(params.get("from")).toBe("中野");
    expect(params.get("to")).toBe("東京");
  });

  it("検索: & や空白を含む駅名も、そのまま1つの値として届く", async () => {
    const fake = stubFetch(json(200, { url: "https://example.com" }));
    await searchRoute("A&B 駅", "C=D");
    const [requested] = fake.mock.calls[0] as unknown as [string];
    const params = new URL(requested, "http://localhost").searchParams;
    expect(params.get("from")).toBe("A&B 駅");
    expect(params.get("to")).toBe("C=D");
  });

  it("キーが無い（503）・見つからない（404）: API の文をエラーとして返す", async () => {
    stubFetch(json(503, { error: "経路検索は使えません（API のキーが設定されていません）" }));
    expect(await searchRoute("中野", "東京")).toEqual({
      ok: false,
      error: { error: "経路検索は使えません（API のキーが設定されていません）" },
    });
  });

  it("入力の誤り（400）: fieldErrors 付きで返す", async () => {
    const error = { error: "入力に誤りがあります", fieldErrors: [{ field: "to", message: "到着駅を入力してください" }] };
    stubFetch(json(400, error));
    expect(await searchRoute("中野", "")).toEqual({ ok: false, error });
  });
});
