import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteDailyRecord, listDailyRecords, saveDailyRecord } from "./daily-records-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("daily-records-api", () => {
  it("月を指定して、その月の記録を読む", async () => {
    const fake = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fake);
    expect(await listDailyRecords("2026-11")).toEqual({ ok: true, value: [] });
    expect(fake).toHaveBeenCalledWith("/api/daily-records?month=2026-11", expect.anything());
  });

  it("API のエラー（月の形式が違うなど）をそのまま返す", async () => {
    const error = { error: "入力に誤りがあります", fieldErrors: [{ field: "month", message: "月は YYYY-MM で指定してください" }] };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(error), { status: 400 })));
    expect(await listDailyRecords("2026-1")).toEqual({ ok: false, error });
  });
});

describe("daily-records-api: 1日分の保存と削除", () => {
  it("保存: PUT で勤務区分を { workStyle } にして送る", async () => {
    const fake = vi.fn(async () => new Response(JSON.stringify({ date: "2026-11-02" }), { status: 200 }));
    vi.stubGlobal("fetch", fake);
    const result = await saveDailyRecord("2026-11-02", { kind: "commute", routeId: "r1" });
    expect(result.ok).toBe(true);
    expect(fake).toHaveBeenCalledWith(
      "/api/daily-records/2026-11-02",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ workStyle: { kind: "commute", routeId: "r1" } }) }),
    );
  });

  it("未入力に戻す: DELETE の 204 を本文なしの成功として返す", async () => {
    const fake = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fake);
    expect(await deleteDailyRecord("2026-11-02")).toEqual({ ok: true, value: undefined });
    expect(fake).toHaveBeenCalledWith("/api/daily-records/2026-11-02", expect.objectContaining({ method: "DELETE" }));
  });
});
