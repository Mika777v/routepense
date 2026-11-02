import type { Route } from "@routepense/shared";
import { describe, expect, it } from "vitest";
import { initialBulkForm, toBulkFormErrors, toBulkPreviewRequest, toggleWeekday } from "./bulk-form";

const route: Route = { id: "r1", userId: "u1", name: "自宅↔本社", from: "中野", to: "東京", transport: "train", oneWayFare: 220 };

describe("initialBulkForm", () => {
  it("表示中の月の1日〜末日・平日。ルートがあれば出勤", () => {
    expect(initialBulkForm("2026-11", [route])).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      weekdays: [1, 2, 3, 4, 5],
      kind: "commute",
      routeId: "r1",
    });
  });

  it("ルートが無ければ在宅", () => {
    expect(initialBulkForm("2026-02", [])).toMatchObject({ endDate: "2026-02-28", kind: "remote", routeId: "" });
  });
});

describe("toggleWeekday", () => {
  it("入れたり外したりし、月〜日の並びにそろえる", () => {
    expect(toggleWeekday([1, 2], 0)).toEqual([1, 2, 0]);
    expect(toggleWeekday([6, 1], 3)).toEqual([1, 3, 6]);
    expect(toggleWeekday([1, 2, 3], 2)).toEqual([1, 3]);
  });
});

describe("toBulkPreviewRequest", () => {
  const base = initialBulkForm("2026-11", [route]);

  it("出勤は routeId だけを送る", () => {
    expect(toBulkPreviewRequest(base).workStyle).toEqual({ kind: "commute", routeId: "r1" });
  });

  it("在宅・休日はルートを送らない", () => {
    expect(toBulkPreviewRequest({ ...base, kind: "holiday" }).workStyle).toEqual({ kind: "holiday" });
  });
});

describe("toBulkFormErrors", () => {
  it("項目の名前を欄に結び付け、workStyle.routeId は勤務区分の欄に出す", () => {
    const result = toBulkFormErrors([
      { field: "endDate", message: "期間は同じ月の中で選んでください" },
      { field: "weekdays", message: "曜日を1つ以上選んでください" },
      { field: "workStyle.routeId", message: "選んだルートが見つかりません" },
      { field: "", message: "JSON のオブジェクトを送ってください" },
    ]);
    expect(result.byField).toEqual({
      endDate: "期間は同じ月の中で選んでください",
      weekdays: "曜日を1つ以上選んでください",
      workStyle: "選んだルートが見つかりません",
    });
    expect(result.other).toEqual(["JSON のオブジェクトを送ってください"]);
  });
});
