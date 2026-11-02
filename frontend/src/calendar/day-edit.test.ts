import type { DailyRecord, RouteSnapshot } from "@routepense/shared";
import { describe, expect, it } from "vitest";
import { choiceOf, dayLabel, errorMessage, isSameChoice, removeRecord, toWorkStyleInput, upsertRecord } from "./day-edit";

const route: RouteSnapshot = { name: "自宅↔本社", from: "中野", to: "東京", transport: "train", oneWayFare: 220 };

function record(date: string, workStyle: DailyRecord["workStyle"]): DailyRecord {
  return { id: `d-${date}`, userId: "u1", date, workStyle, extraTrips: [] };
}

describe("choiceOf・toWorkStyleInput", () => {
  it("記録が無ければ未入力", () => {
    expect(choiceOf(undefined)).toEqual({ kind: "unentered" });
  });

  it("出勤は routeId だけの形に戻す（ルートの値は送らない）", () => {
    expect(choiceOf(record("2026-11-02", { kind: "commute", routeId: "r1", route }))).toEqual({
      kind: "commute",
      routeId: "r1",
    });
    expect(toWorkStyleInput({ kind: "holiday" })).toEqual({ kind: "holiday" });
  });
});

describe("isSameChoice", () => {
  it("出勤はルートまで同じときだけ同じ", () => {
    expect(isSameChoice({ kind: "commute", routeId: "r1" }, { kind: "commute", routeId: "r1" })).toBe(true);
    expect(isSameChoice({ kind: "commute", routeId: "r1" }, { kind: "commute", routeId: "r2" })).toBe(false);
  });

  it("休日と未入力は別のもの", () => {
    expect(isSameChoice({ kind: "holiday" }, { kind: "unentered" })).toBe(false);
    expect(isSameChoice({ kind: "remote" }, { kind: "remote" })).toBe(true);
  });
});

describe("upsertRecord・removeRecord", () => {
  const records = [record("2026-11-02", { kind: "remote" }), record("2026-11-05", { kind: "holiday" })];

  it("同じ日があれば置き換える", () => {
    const saved = record("2026-11-02", { kind: "holiday" });
    expect(upsertRecord(records, saved)).toEqual([saved, records[1]]);
  });

  it("無ければ足し、日付の順に並べる", () => {
    const saved = record("2026-11-03", { kind: "remote" });
    expect(upsertRecord(records, saved).map((r) => r.date)).toEqual(["2026-11-02", "2026-11-03", "2026-11-05"]);
  });

  it("元の配列は変えない", () => {
    upsertRecord(records, record("2026-11-03", { kind: "remote" }));
    removeRecord(records, "2026-11-02");
    expect(records).toHaveLength(2);
  });

  it("その日の記録を除く", () => {
    expect(removeRecord(records, "2026-11-02").map((r) => r.date)).toEqual(["2026-11-05"]);
  });
});

describe("errorMessage", () => {
  it("項目ごとの理由があれば添える", () => {
    expect(
      errorMessage({ error: "入力に誤りがあります", fieldErrors: [{ field: "workStyle.routeId", message: "ルートが見つかりません" }] }),
    ).toBe("入力に誤りがあります。ルートが見つかりません");
    expect(errorMessage({ error: "サーバーに接続できません" })).toBe("サーバーに接続できません");
  });
});

describe("dayLabel", () => {
  it("月・日・曜日で表す", () => {
    expect(dayLabel("2026-11-02")).toBe("11月2日（月）");
  });
});
