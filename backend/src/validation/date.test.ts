import { describe, expect, it } from "vitest";
import { isDateString, isMonthString } from "./date";

describe("isDateString", () => {
  it("実在する日は true", () => {
    expect(isDateString("2026-11-02")).toBe(true);
    expect(isDateString("2028-02-29")).toBe(true);
  });

  it("実在しない日は false（2月30日・平年の2月29日・13月）", () => {
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2027-02-29")).toBe(false);
    expect(isDateString("2026-13-01")).toBe(false);
  });

  it("形が違えば false", () => {
    expect(isDateString("2026-11-2")).toBe(false);
    expect(isDateString("2026/11/02")).toBe(false);
    expect(isDateString(20261102)).toBe(false);
    expect(isDateString(undefined)).toBe(false);
  });
});

describe("isMonthString", () => {
  it("YYYY-MM なら true、月が範囲の外や形が違えば false", () => {
    expect(isMonthString("2026-11")).toBe(true);
    expect(isMonthString("2026-00")).toBe(false);
    expect(isMonthString("2026-13")).toBe(false);
    expect(isMonthString("2026-1")).toBe(false);
  });
});
