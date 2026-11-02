import type { DailyRecord, RouteSnapshot } from "@routepense/shared";
import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  countUnentered,
  currentMonth,
  daysInMonth,
  monthLabel,
  shiftMonth,
  workStyleLabel,
} from "./month";

const route: RouteSnapshot = { name: "自宅↔本社", from: "中野", to: "東京", transport: "train", oneWayFare: 220 };

function record(date: string, workStyle: DailyRecord["workStyle"], extraTrips: DailyRecord["extraTrips"] = []): DailyRecord {
  return { id: `d-${date}`, userId: "u1", date, workStyle, extraTrips };
}

describe("shiftMonth", () => {
  it("前後の月に動かせる。年をまたいでもよい", () => {
    expect(shiftMonth("2026-11", 1)).toBe("2026-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("daysInMonth", () => {
  it("月ごとの日数を返す（うるう年の2月を含む）", () => {
    expect(daysInMonth("2026-11")).toBe(30);
    expect(daysInMonth("2026-12")).toBe(31);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
  });
});

describe("currentMonth・monthLabel", () => {
  it("今日の月を YYYY-MM で返し、表示用の名前にできる", () => {
    const month = currentMonth(new Date(2026, 10, 2)); // 月は 0 始まり（10 = 11月）
    expect(month).toBe("2026-11");
    expect(monthLabel(month)).toBe("2026年11月");
  });
});

describe("buildCalendar", () => {
  it("月曜始まりの週に並べ、前後の月の日は null で埋める", () => {
    // 2026-11-01 は日曜。月曜始まりなら、最初の週は6マス空いてから1日が来る
    const weeks = buildCalendar("2026-11", []);
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]?.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0]?.[6]?.date).toBe("2026-11-01");
    expect(weeks[5]?.[0]?.date).toBe("2026-11-30");
    expect(weeks[5]?.slice(1)).toEqual([null, null, null, null, null, null]);
  });

  it("記録の無い日は未入力、ある日は記録と交通費を持つ", () => {
    const weeks = buildCalendar("2026-11", [
      record("2026-11-02", { kind: "commute", routeId: "r1", route }),
      record("2026-11-03", { kind: "holiday" }),
    ]);
    const days = weeks.flat();
    const nov2 = days.find((day) => day?.date === "2026-11-02");
    expect(nov2?.status).toMatchObject({ kind: "recorded", fare: 440 });
    // 休日と未入力は別の状態になる
    expect(days.find((day) => day?.date === "2026-11-03")?.status.kind).toBe("recorded");
    expect(days.find((day) => day?.date === "2026-11-04")?.status).toEqual({ kind: "unentered" });
    expect(countUnentered(weeks)).toBe(28);
  });

  it("祝日には祝日名を持たせ、祝日でない日はプロパティ自体を持たない", () => {
    const days = buildCalendar("2026-11", [record("2026-11-03", { kind: "commute", routeId: "r1", route })]).flat();
    const nov3 = days.find((day) => day?.date === "2026-11-03");
    expect(nov3?.holidayName).toBe("文化の日");
    // 祝日でも、勤務区分（出勤）はそのまま
    expect(nov3?.status).toMatchObject({ kind: "recorded", fare: 440 });
    expect(days.find((day) => day?.date === "2026-11-23")?.holidayName).toBe("勤労感謝の日");
    expect(days.find((day) => day?.date === "2026-11-04")).not.toHaveProperty("holidayName");
  });

  it("交通費には追加の移動も含める", () => {
    const weeks = buildCalendar("2026-11", [
      record("2026-11-05", { kind: "remote" }, [
        { id: "t1", from: "中野", to: "新宿", transport: "train", oneWayFare: 170, tripType: "roundTrip" },
      ]),
    ]);
    const day = weeks.flat().find((d) => d?.date === "2026-11-05");
    expect(day?.status).toMatchObject({ kind: "recorded", fare: 340 });
  });

  it("1日が月曜の月は、最初の週が空のマス無しで始まる", () => {
    // 2027-02-01 は月曜。28日なのでちょうど4週
    const weeks = buildCalendar("2027-02", []);
    expect(weeks).toHaveLength(4);
    expect(weeks[0]?.[0]?.date).toBe("2027-02-01");
    expect(weeks.flat().includes(null)).toBe(false);
  });
});

describe("workStyleLabel", () => {
  it("勤務区分の表示名。出勤はルート名を添える", () => {
    expect(workStyleLabel({ kind: "remote" })).toBe("在宅");
    expect(workStyleLabel({ kind: "commute", routeId: "r1", route })).toBe("出勤（自宅↔本社）");
    expect(workStyleLabel({ kind: "holiday" })).toBe("休日");
  });
});
