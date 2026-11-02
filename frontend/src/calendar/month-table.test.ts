import type { DailyRecord, RouteSnapshot } from "@routepense/shared";
import { describe, expect, it } from "vitest";
import { buildCalendar } from "./month";
import { buildTableRows, dateLabel } from "./month-table";

const route: RouteSnapshot = {
  name: "自宅↔本社",
  from: "中野",
  to: "東京",
  transport: "train",
  oneWayFare: 220,
};

function record(
  date: string,
  workStyle: DailyRecord["workStyle"],
  extraTrips: DailyRecord["extraTrips"] = [],
): DailyRecord {
  return { id: `d-${date}`, userId: "u1", date, workStyle, extraTrips };
}

const records: DailyRecord[] = [
  record("2026-11-02", { kind: "commute", routeId: "r1", route }, [
    {
      id: "t1",
      from: "東京",
      to: "品川",
      transport: "train",
      oneWayFare: 170,
      tripType: "roundTrip",
      purpose: "客先B打合せ",
    },
    {
      id: "t2",
      from: "品川",
      to: "中野",
      transport: "bus",
      oneWayFare: 210,
      tripType: "oneWay",
    },
  ]),
  record("2026-11-03", { kind: "remote" }),
  record("2026-11-01", { kind: "holiday" }),
];

describe("dateLabel", () => {
  it("月/日（曜日）の形にする", () => {
    expect(dateLabel({ date: "2026-11-02", day: 2, weekday: 1 })).toBe("11/2（月）");
    expect(dateLabel({ date: "2026-12-31", day: 31, weekday: 4 })).toBe("12/31（木）");
  });
});

describe("buildTableRows", () => {
  const weeks = buildCalendar("2026-11", records, new Set(["2026-11-03"]));
  const rows = buildTableRows(weeks);

  it("月の全部の日を、日付の順に1行ずつ並べる（空のマスは入れない）", () => {
    expect(rows).toHaveLength(30);
    expect(rows[0]?.date).toBe("2026-11-01");
    expect(rows.at(-1)?.date).toBe("2026-11-30");
  });

  it("カレンダーと同じ日・同じ金額になる", () => {
    const calendarDays = weeks.flat().filter((day) => day !== null);
    expect(rows.map((row) => row.date)).toEqual(calendarDays.map((day) => day.date));
    expect(rows.map((row) => row.fare)).toEqual(
      calendarDays.map((day) => (day.status.kind === "recorded" ? day.status.fare : null)),
    );
  });

  it("出勤の日は、通常の交通費と追加の移動の内訳を持つ", () => {
    const row = rows.find((r) => r.date === "2026-11-02");
    expect(row).toMatchObject({
      dateLabel: "11/2（月）",
      kindLabel: "出勤（自宅↔本社）",
      workStyleFare: 440,
      fare: 440 + 340 + 210,
      isUnentered: false,
      isWeekend: false,
    });
    expect(row?.trips).toEqual([
      {
        id: "t1",
        section: "東京 → 品川",
        transport: "train",
        tripType: "roundTrip",
        fare: 340,
        purpose: "客先B打合せ",
      },
      {
        id: "t2",
        section: "品川 → 中野",
        transport: "bus",
        tripType: "oneWay",
        fare: 210,
      },
    ]);
  });

  it("未入力の日は、金額を null にして 0 円と区別する", () => {
    const row = rows.find((r) => r.date === "2026-11-04");
    expect(row).toMatchObject({
      kindLabel: "未入力",
      workStyleFare: null,
      fare: null,
      trips: [],
      isUnentered: true,
    });
  });

  it("休日は土日の印と 0 円、当てはめ中の日は isDraft が付く", () => {
    expect(rows.find((r) => r.date === "2026-11-01")).toMatchObject({
      kindLabel: "休日",
      fare: 0,
      isWeekend: true,
    });
    expect(rows.find((r) => r.date === "2026-11-03")?.isDraft).toBe(true);
    expect(rows.find((r) => r.date === "2026-11-02")?.isDraft).toBe(false);
  });
});
