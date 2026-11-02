import { describe, expect, it } from "vitest";
import { applyBulk } from "./bulk-apply";
import type { DailyRecord } from "./daily-record";
import type { ExtraTrip } from "./extra-trip";
import type { WorkStyle } from "./work-style";

const commute: WorkStyle = {
  kind: "commute",
  routeId: "route-1",
  route: { name: "自宅↔本社", from: "A駅", to: "B駅", transport: "train", oneWayFare: 220 },
};

const trip: ExtraTrip = {
  id: "trip-1",
  from: "B駅",
  to: "C駅",
  transport: "train",
  oneWayFare: 160,
  tripType: "roundTrip",
};

function record(date: string, overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: `record-${date}`,
    userId: "user-1",
    date,
    workStyle: { kind: "remote" },
    extraTrips: [],
    ...overrides,
  };
}

describe("applyBulk", () => {
  it("記録が無い日は、追加の移動が0件の記録を新しく作る", () => {
    const result = applyBulk(["2026-11-02", "2026-11-03"], commute, []);
    expect(result.records).toEqual([
      { date: "2026-11-02", workStyle: commute, extraTrips: [] },
      { date: "2026-11-03", workStyle: commute, extraTrips: [] },
    ]);
    expect(result.overwrittenDates).toEqual([]);
    expect(result.datesWithExtraTrips).toEqual([]);
  });

  it("記録がある日は、勤務区分だけを置き換え、追加の移動は残す", () => {
    const existing = [record("2026-11-02", { extraTrips: [trip] })];
    const result = applyBulk(["2026-11-02"], commute, existing);
    expect(result.records).toEqual([{ date: "2026-11-02", workStyle: commute, extraTrips: [trip] }]);
  });

  it("上書きする日と、そのうち追加の移動がある日を返す", () => {
    const existing = [
      record("2026-11-02", { extraTrips: [trip] }),
      record("2026-11-04"),
      // 対象の日ではない記録は、数に入れない
      record("2026-11-10", { extraTrips: [trip] }),
    ];
    const result = applyBulk(["2026-11-02", "2026-11-03", "2026-11-04"], commute, existing);
    expect(result.records.map((r) => r.date)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(result.overwrittenDates).toEqual(["2026-11-02", "2026-11-04"]);
    expect(result.datesWithExtraTrips).toEqual(["2026-11-02"]);
  });

  it("対象の日が無ければ、何も作らない", () => {
    const result = applyBulk([], commute, [record("2026-11-02")]);
    expect(result).toEqual({ records: [], overwrittenDates: [], datesWithExtraTrips: [] });
  });

  it("対象の日が並んでいなくても、古い順に返す", () => {
    const result = applyBulk(["2026-11-05", "2026-11-02"], { kind: "holiday" }, []);
    expect(result.records.map((r) => r.date)).toEqual(["2026-11-02", "2026-11-05"]);
  });

  it("引数（既存の記録と対象の日）を書き換えない", () => {
    const existing = [record("2026-11-02", { extraTrips: [trip] })];
    const dates = ["2026-11-03", "2026-11-02"];
    const result = applyBulk(dates, commute, existing);

    expect(existing[0]?.workStyle).toEqual({ kind: "remote" });
    expect(dates).toEqual(["2026-11-03", "2026-11-02"]);
    // 返した記録の追加の移動を変えても、既存の記録には響かない
    result.records[0]?.extraTrips.push({ ...trip, id: "trip-2" });
    expect(existing[0]?.extraTrips).toHaveLength(1);
  });
});
