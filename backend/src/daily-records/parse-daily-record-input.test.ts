import { describe, expect, it } from "vitest";
import { parseExtraTripInput, parseWorkStyleInput } from "./parse-daily-record-input";

const trip = { from: "B駅", to: "C駅", transport: "bus", oneWayFare: 160, tripType: "oneWay" };

describe("parseWorkStyleInput", () => {
  it("在宅・休日・出勤を受け取れる。出勤の余計な項目は捨てる", () => {
    expect(parseWorkStyleInput({ kind: "remote" })).toEqual({ ok: true, value: { kind: "remote" } });
    expect(parseWorkStyleInput({ kind: "holiday" })).toEqual({ ok: true, value: { kind: "holiday" } });
    expect(
      parseWorkStyleInput({ kind: "commute", routeId: "r1", route: { oneWayFare: 1 } }),
    ).toEqual({ ok: true, value: { kind: "commute", routeId: "r1" } });
  });

  it("項目の名前の前に、呼んだ側が渡した名前を付ける", () => {
    const result = parseWorkStyleInput({ kind: "x" }, "bulk.workStyle");
    expect(result.ok ? [] : result.errors.map((e) => e.field)).toEqual(["bulk.workStyle.kind"]);
  });
});

describe("parseExtraTripInput", () => {
  it("正しい入力は、前後の空白を取り除いて受け取る", () => {
    expect(parseExtraTripInput({ ...trip, from: " B駅 ", purpose: " 客先A " })).toEqual({
      ok: true,
      value: { ...trip, purpose: "客先A" },
    });
  });

  it("任意の項目が空なら、プロパティを付けない", () => {
    const result = parseExtraTripInput({ ...trip, purpose: "  ", sourceRouteId: null });
    expect(result).toEqual({ ok: true, value: trip });
  });

  it("任意の項目が文字でなければ誤り", () => {
    const result = parseExtraTripInput({ ...trip, purpose: 1 });
    expect(result.ok ? [] : result.errors.map((e) => e.field)).toEqual(["purpose"]);
  });

  it("オブジェクトでなければ誤り", () => {
    expect(parseExtraTripInput([]).ok).toBe(false);
  });
});
