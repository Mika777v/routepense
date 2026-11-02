import type { Route } from "@routepense/shared";
import { describe, expect, it } from "vitest";
import { holidaysInRange, initialBulkForm, toBulkFormErrors, toBulkPreviewRequest, toggleWeekday } from "./bulk-form";

const route: Route = { id: "r1", userId: "u1", name: "自宅↔本社", from: "中野", to: "東京", transport: "train", oneWayFare: 220 };

describe("initialBulkForm", () => {
  it("表示中の月の1日〜末日・平日・祝日を除く。ルートがあれば出勤", () => {
    expect(initialBulkForm("2026-11", [route])).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      weekdays: [1, 2, 3, 4, 5],
      skipHolidays: true,
      kind: "commute",
      routeId: "r1",
    });
  });

  it("ルートが無ければ在宅", () => {
    expect(initialBulkForm("2026-02", [])).toMatchObject({ endDate: "2026-02-28", kind: "remote", routeId: "" });
  });
});

describe("holidaysInRange", () => {
  it("期間の中の祝日を、月/日 と名前で古い順に返す", () => {
    expect(holidaysInRange("2026-11-01", "2026-11-30")).toEqual(["11/3 文化の日", "11/23 勤労感謝の日"]);
  });

  it("開始日・終了日の当日も含める。日曜の祝日も出す", () => {
    expect(holidaysInRange("2026-05-03", "2026-05-06")).toEqual([
      "5/3 憲法記念日",
      "5/4 みどりの日",
      "5/5 こどもの日",
      "5/6 振替休日",
    ]);
  });

  it("祝日の無い期間・逆さまの期間・未入力の期間は空", () => {
    expect(holidaysInRange("2026-11-04", "2026-11-22")).toEqual([]);
    expect(holidaysInRange("2026-11-30", "2026-11-01")).toEqual([]);
    expect(holidaysInRange("", "")).toEqual([]);
    // 開始日だけ空でも、一覧の最初からの祝日を拾わない
    expect(holidaysInRange("", "2026-11-30")).toEqual([]);
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

  it("祝日を除くかのチェックを、そのまま送る", () => {
    expect(toBulkPreviewRequest(base).skipHolidays).toBe(true);
    expect(toBulkPreviewRequest({ ...base, skipHolidays: false }).skipHolidays).toBe(false);
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
