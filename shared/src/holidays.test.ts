import { describe, expect, it } from "vitest";
import { nextDate, weekdayOf } from "./date";
import { HOLIDAY_YEARS, HOLIDAYS, holidayName } from "./holidays";

/** 前の日（テストの中だけで使う。Date.UTC は日が 0 なら前の月の末日に繰り下げる） */
function previousDate(date: string): string {
  const [y, m, d] = [Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))];
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

describe("holidayName", () => {
  it("祝日なら祝日名を返す", () => {
    expect(holidayName("2026-11-03")).toBe("文化の日");
    expect(holidayName("2027-01-01")).toBe("元日");
  });

  it("振替休日・国民の休日も祝日として返す", () => {
    expect(holidayName("2026-05-06")).toBe("振替休日");
    expect(holidayName("2026-09-22")).toBe("国民の休日");
  });

  it("祝日でない日は undefined", () => {
    expect(holidayName("2026-11-02")).toBeUndefined();
  });

  it("一覧に無い年の日は、祝日が無いものとして undefined", () => {
    expect(holidayName("2025-01-01")).toBeUndefined();
    expect(holidayName("2028-01-01")).toBeUndefined();
  });

  it("Object.prototype のプロパティ名を渡しても、祝日名にならない", () => {
    expect(holidayName("constructor")).toBeUndefined();
    expect(holidayName("toString")).toBeUndefined();
  });
});

describe("HOLIDAYS（一覧の書き間違いを見つける）", () => {
  const dates = [...HOLIDAYS.keys()];

  it("日付はどれも実在する YYYY-MM-DD", () => {
    for (const date of dates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // 実在しない日（2月30日など）は、前の日の nextDate と一致しない
      expect(nextDate(previousDate(date))).toBe(date);
    }
  });

  it("古い順に並んでいる（年を足すときに探しやすくする）", () => {
    expect(dates).toEqual([...dates].sort());
  });

  it("一覧の年と HOLIDAY_YEARS がそろっている", () => {
    const years = [...new Set(dates.map((date) => Number(date.slice(0, 4))))];
    expect(years).toEqual([...HOLIDAY_YEARS]);
  });

  it("振替休日は、日曜の祝日から祝日が続いた次の日", () => {
    // 振替休日は「日曜の祝日の後で、いちばん近い祝日でない日」（2026-05-03（日）→ 5/4・5/5 も祝日 → 5/6）
    for (const [date, name] of HOLIDAYS) {
      if (name !== "振替休日") continue;
      let day = previousDate(date);
      while (holidayName(day) !== undefined && weekdayOf(day) !== 0) {
        day = previousDate(day);
      }
      expect(weekdayOf(day)).toBe(0);
      expect(holidayName(day)).toBeDefined();
    }
  });

  it("月曜の祝日（ハッピーマンデー）は月曜", () => {
    for (const [date, name] of HOLIDAYS) {
      if (["成人の日", "海の日", "敬老の日", "スポーツの日"].includes(name)) {
        expect(weekdayOf(date)).toBe(1);
      }
    }
  });
});
