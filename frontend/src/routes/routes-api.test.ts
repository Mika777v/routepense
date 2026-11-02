import type { RouteInput } from "@routepense/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoute, deleteRoute, listRoutes, updateRoute } from "./routes-api";

const input: RouteInput = { name: "自宅↔本社", from: "中野", to: "東京", transport: "train", oneWayFare: 220 };

/** fetch を、決まった応答を返す偽物に差し替える */
function stubFetch(response: Response | Error) {
  const fake = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fake);
  return fake;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("routes-api", () => {
  it("一覧: 成功なら ok と値を返す", async () => {
    stubFetch(json(200, []));
    expect(await listRoutes()).toEqual({ ok: true, value: [] });
  });

  it("登録: POST で本文を JSON にして送る", async () => {
    const fake = stubFetch(json(201, { ...input, id: "r1", userId: "u1" }));
    const result = await createRoute(input);
    expect(result.ok).toBe(true);
    expect(fake).toHaveBeenCalledWith("/api/routes", expect.objectContaining({ method: "POST", body: JSON.stringify(input) }));
  });

  it("入力の誤り: API の ApiError（fieldErrors 付き）をそのまま返す", async () => {
    const error = { error: "入力に誤りがあります", fieldErrors: [{ field: "name", message: "ルート名を入力してください" }] };
    stubFetch(json(400, error));
    expect(await updateRoute("r1", input)).toEqual({ ok: false, error });
  });

  it("削除: 204 は本文なしの成功として返す", async () => {
    const fake = stubFetch(new Response(null, { status: 204 }));
    expect(await deleteRoute("r 1")).toEqual({ ok: true, value: undefined });
    expect(fake).toHaveBeenCalledWith("/api/routes/r%201", expect.objectContaining({ method: "DELETE" }));
  });

  it("本文が JSON でないエラーでも、既定の文を返す", async () => {
    stubFetch(new Response("<html>", { status: 502 }));
    expect(await listRoutes()).toEqual({ ok: false, error: { error: "エラーが起きました（HTTP 502）" } });
  });

  it("通信そのものが失敗したら、接続できない旨を返す", async () => {
    stubFetch(new TypeError("fetch failed"));
    const result = await listRoutes();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error).toContain("接続できません");
  });
});
