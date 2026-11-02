import { describe, expect, it } from "vitest";
import { parseRouteInput } from "./parse-route-input";

const valid = { name: "自宅↔本社", from: "A駅", to: "B駅", transport: "train", oneWayFare: 220 };

function fields(body: unknown): string[] {
  const result = parseRouteInput(body);
  return result.ok ? [] : result.errors.map((e) => e.field);
}

describe("parseRouteInput", () => {
  it("正しい入力は ok で、前後の空白を取り除く", () => {
    expect(parseRouteInput({ ...valid, name: "  自宅↔本社  " })).toEqual({ ok: true, value: valid });
  });

  it("余分な項目は取り込まない", () => {
    const result = parseRouteInput({ ...valid, id: "x", userId: "someone" });
    expect(result).toEqual({ ok: true, value: valid });
  });

  it("オブジェクトでなければエラー", () => {
    expect(fields(null)).toEqual([""]);
    expect(fields([valid])).toEqual([""]);
    expect(fields("text")).toEqual([""]);
  });

  it("文字列の項目が空・空白だけ・文字列でなければエラー", () => {
    expect(fields({ ...valid, name: "" })).toEqual(["name"]);
    expect(fields({ ...valid, from: "   " })).toEqual(["from"]);
    expect(fields({ ...valid, to: 1 })).toEqual(["to"]);
  });

  it("101文字以上はエラー", () => {
    expect(fields({ ...valid, name: "あ".repeat(100) })).toEqual([]);
    expect(fields({ ...valid, name: "あ".repeat(101) })).toEqual(["name"]);
  });

  it("交通手段は決まった3つだけ", () => {
    expect(fields({ ...valid, transport: "bus" })).toEqual([]);
    expect(fields({ ...valid, transport: "plane" })).toEqual(["transport"]);
  });

  it("片道運賃は 0〜100000 の整数", () => {
    expect(fields({ ...valid, oneWayFare: 0 })).toEqual([]);
    expect(fields({ ...valid, oneWayFare: 100_000 })).toEqual([]);
    expect(fields({ ...valid, oneWayFare: 100_001 })).toEqual(["oneWayFare"]);
    expect(fields({ ...valid, oneWayFare: -1 })).toEqual(["oneWayFare"]);
    expect(fields({ ...valid, oneWayFare: 1.5 })).toEqual(["oneWayFare"]);
    expect(fields({ ...valid, oneWayFare: "220" })).toEqual(["oneWayFare"]);
  });

  it("誤りが複数あれば、全部まとめて返す", () => {
    expect(fields({})).toEqual(["name", "from", "to", "transport", "oneWayFare"]);
  });
});
