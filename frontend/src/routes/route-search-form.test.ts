import { describe, expect, it } from "vitest";
import { isOpenableUrl, stationQuery, toStationErrors } from "./route-search-form";

describe("stationQuery", () => {
  it("駅の欄が空なら、ルートの出発地・到着地を使う", () => {
    expect(stationQuery({ from: "", to: " " }, { from: "中野", to: "東京" })).toEqual({ from: "中野", to: "東京" });
  });

  it("駅の欄に入れた方を優先し、前後の空白を除く", () => {
    expect(stationQuery({ from: " 中野 ", to: "" }, { from: "自宅", to: "東京" })).toEqual({ from: "中野", to: "東京" });
  });

  it("どちらも空なら空のまま（判定は API に任せる）", () => {
    expect(stationQuery({ from: "", to: "" }, { from: "", to: "" })).toEqual({ from: "", to: "" });
  });
});

describe("toStationErrors", () => {
  it("from / to を駅の欄に分け、同じ欄の2つ目からは捨てる", () => {
    expect(
      toStationErrors([
        { field: "from", message: "出発駅を入力してください" },
        { field: "from", message: "2つ目" },
        { field: "to", message: "到着駅を入力してください" },
        { field: "other", message: "ほかのエラー" },
      ]),
    ).toEqual({ from: "出発駅を入力してください", to: "到着駅を入力してください", other: ["ほかのエラー"] });
  });
});

describe("isOpenableUrl", () => {
  it.each([
    ["https://roote.ekispert.net/result", true],
    [" http://example.com ", true],
    ["", false],
    ["roote.ekispert.net", false],
    ["javascript:alert(1)", false],
  ])("%s → %s", (value, expected) => {
    expect(isOpenableUrl(value)).toBe(expected);
  });
});
