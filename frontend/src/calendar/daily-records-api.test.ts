import { afterEach, describe, expect, it, vi } from "vitest";
import { listDailyRecords } from "./daily-records-api";

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
