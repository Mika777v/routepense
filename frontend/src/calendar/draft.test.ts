import type { DailyRecord, Route, RouteSnapshot, WorkStyle } from "@routepense/shared";
import { describe, expect, it } from "vitest";
import { mergeDraft, overlayDraft, setDraftDay, summarizeDraft, toDraftWorkStyle, type Draft } from "./draft";

const snapshot: RouteSnapshot = { name: "自宅↔本社", from: "中野", to: "東京", transport: "train", oneWayFare: 220 };
const route: Route = { id: "r1", userId: "u1", ...snapshot };
const commute = { kind: "commute", routeId: "r1", route: snapshot } as const;
const trip = { id: "t1", from: "中野", to: "新宿", transport: "train", oneWayFare: 170, tripType: "roundTrip" } as const;

function record(date: string, workStyle: DailyRecord["workStyle"], extraTrips: DailyRecord["extraTrips"] = []): DailyRecord {
  return { id: `d-${date}`, userId: "u1", date, workStyle, extraTrips };
}

describe("mergeDraft・setDraftDay", () => {
  it("後から当てはめた方を使う（平日に出勤 → 土日に休日、を重ねられる）", () => {
    let draft: Draft = new Map();
    draft = mergeDraft(draft, [
      { date: "2026-11-06", workStyle: commute },
      { date: "2026-11-07", workStyle: commute },
    ]);
    draft = mergeDraft(draft, [{ date: "2026-11-07", workStyle: { kind: "holiday" } }]);
    expect([...draft]).toEqual([
      ["2026-11-06", commute],
      ["2026-11-07", { kind: "holiday" }],
    ]);
  });

  it("1日分を直す・外す。元の Map は変えない", () => {
    const draft: Draft = new Map([["2026-11-06", commute]]);
    expect(setDraftDay(draft, "2026-11-06", { kind: "remote" }).get("2026-11-06")).toEqual({ kind: "remote" });
    expect(setDraftDay(draft, "2026-11-06", null).size).toBe(0);
    expect(draft.get("2026-11-06")).toBe(commute);
  });
});

describe("toDraftWorkStyle", () => {
  it("出勤はルートの値をコピーする。見つからなければ undefined", () => {
    expect(toDraftWorkStyle({ kind: "commute", routeId: "r1" }, [route])).toEqual(commute);
    expect(toDraftWorkStyle({ kind: "commute", routeId: "nope" }, [route])).toBeUndefined();
    expect(toDraftWorkStyle({ kind: "remote" }, [])).toEqual({ kind: "remote" });
  });
});

describe("overlayDraft", () => {
  it("当てはめた勤務区分を重ね、追加の移動は保存済みのものを残す", () => {
    const saved = [record("2026-11-02", { kind: "remote" }, [trip]), record("2026-11-03", { kind: "holiday" })];
    const result = overlayDraft(saved, new Map<string, WorkStyle>([["2026-11-02", commute], ["2026-11-04", commute]]));
    expect(result.map((r) => [r.date, r.workStyle.kind, r.extraTrips.length])).toEqual([
      ["2026-11-02", "commute", 1],
      ["2026-11-03", "holiday", 0],
      ["2026-11-04", "commute", 0],
    ]);
  });
});

describe("summarizeDraft", () => {
  it("登録の本文（routeId だけ）と、上書きする日・追加の移動がある日を返す", () => {
    const saved = [record("2026-11-02", { kind: "remote" }, [trip]), record("2026-11-03", { kind: "holiday" })];
    const draft: Draft = new Map<string, WorkStyle>([
      ["2026-11-04", { kind: "holiday" }],
      ["2026-11-02", commute],
      ["2026-11-03", { kind: "remote" }],
    ]);
    expect(summarizeDraft(draft, saved)).toEqual({
      request: {
        days: [
          { date: "2026-11-02", workStyle: { kind: "commute", routeId: "r1" } },
          { date: "2026-11-03", workStyle: { kind: "remote" } },
          { date: "2026-11-04", workStyle: { kind: "holiday" } },
        ],
      },
      overwrittenDates: ["2026-11-02", "2026-11-03"],
      datesWithExtraTrips: ["2026-11-02"],
    });
  });

  it("記録の無い日だけなら、上書きは0日", () => {
    expect(summarizeDraft(new Map([["2026-11-04", { kind: "holiday" }]]), []).overwrittenDates).toEqual([]);
  });
});
