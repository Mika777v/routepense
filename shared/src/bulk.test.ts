import { describe, expect, it } from "vitest";
import { bulkTargetDates } from "./bulk";
import type { Weekday } from "./date";

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];
const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

describe("bulkTargetDates", () => {
  it("平日のみ: 2026-11-01（日）〜 11-08（日）は 11-02〜11-06 の5日", () => {
    expect(
      bulkTargetDates({ startDate: "2026-11-01", endDate: "2026-11-08", weekdays: WEEKDAYS }),
    ).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
  });

  it("毎日: 11月は30日分あり、最後は月末の 11-30", () => {
    const dates = bulkTargetDates({
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      weekdays: EVERY_DAY,
    });
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe("2026-11-01");
    expect(dates.at(-1)).toBe("2026-11-30");
  });

  it("特定の曜日（月・水・金）だけを選ぶ", () => {
    expect(
      bulkTargetDates({ startDate: "2026-11-01", endDate: "2026-11-14", weekdays: [1, 3, 5] }),
    ).toEqual(["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09", "2026-11-11", "2026-11-13"]);
  });

  it("土日だけ（休日を当てはめるときの使い方）", () => {
    expect(
      bulkTargetDates({ startDate: "2026-11-01", endDate: "2026-11-08", weekdays: [0, 6] }),
    ).toEqual(["2026-11-01", "2026-11-07", "2026-11-08"]);
  });

  it("うるう年の2月は29日まで数える", () => {
    const dates = bulkTargetDates({
      startDate: "2028-02-01",
      endDate: "2028-02-29",
      weekdays: EVERY_DAY,
    });
    expect(dates).toHaveLength(29);
    expect(dates.at(-1)).toBe("2028-02-29");
  });

  it("開始日と終了日が同じ日: 曜日が合えば1日、合わなければ0日", () => {
    expect(
      bulkTargetDates({ startDate: "2026-11-02", endDate: "2026-11-02", weekdays: WEEKDAYS }),
    ).toEqual(["2026-11-02"]);
    expect(
      bulkTargetDates({ startDate: "2026-11-01", endDate: "2026-11-01", weekdays: WEEKDAYS }),
    ).toEqual([]);
  });

  it("開始日が終了日より後なら空", () => {
    expect(
      bulkTargetDates({ startDate: "2026-11-10", endDate: "2026-11-01", weekdays: EVERY_DAY }),
    ).toEqual([]);
  });
});
