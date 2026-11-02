import { describe, expect, it } from "vitest";
import { parseRouteSearchQuery } from "./parse-route-search-query";

describe("parseRouteSearchQuery", () => {
  it("前後の空白を取り除いて受け付ける", () => {
    expect(parseRouteSearchQuery({ from: " 東京 ", to: "新宿" })).toEqual({ ok: true, value: { from: "東京", to: "新宿" } });
  });

  it("無い・空・文字でない（同じ名前が2つで配列になった）ときは、項目ごとに理由を返す", () => {
    const result = parseRouteSearchQuery({ from: " ", to: ["A", "B"] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.field)).toEqual(["from", "to"]);
  });

  it("長すぎる駅名と、出発と到着が同じ駅は受け付けない", () => {
    const long = parseRouteSearchQuery({ from: "あ".repeat(101), to: "B" });
    expect(long.ok).toBe(false);

    const same = parseRouteSearchQuery({ from: "東京", to: " 東京" });
    expect(same).toEqual({ ok: false, errors: [{ field: "to", message: "到着駅は出発駅と別の駅を入力してください" }] });
  });
});
