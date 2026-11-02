import { describe, expect, it } from "vitest";
import { nextDate, weekdayOf } from "./date";

describe("weekdayOf", () => {
  it("2026-11-02 は月曜（1）", () => {
    expect(weekdayOf("2026-11-02")).toBe(1);
  });

  it("2026-11-01 は日曜（0）、2026-11-07 は土曜（6）", () => {
    expect(weekdayOf("2026-11-01")).toBe(0);
    expect(weekdayOf("2026-11-07")).toBe(6);
  });
});

describe("nextDate", () => {
  it("月の途中は日だけ進む", () => {
    expect(nextDate("2026-11-02")).toBe("2026-11-03");
  });

  it("月末は翌月の1日になる", () => {
    expect(nextDate("2026-11-30")).toBe("2026-12-01");
  });

  it("年末は翌年の1月1日になる", () => {
    expect(nextDate("2026-12-31")).toBe("2027-01-01");
  });

  it("うるう年の2月28日の次は29日、平年は3月1日", () => {
    expect(nextDate("2028-02-28")).toBe("2028-02-29");
    expect(nextDate("2027-02-28")).toBe("2027-03-01");
  });
});
