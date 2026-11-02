import type { Route } from "@routepense/shared";
import { describe, expect, it } from "vitest";
import { emptyRouteForm, formatYen, toRouteFormErrors, toRouteFormValues, toRouteInput } from "./route-form";

const route: Route = {
  id: "r1",
  userId: "u1",
  name: "自宅↔本社",
  from: "中野",
  to: "東京",
  transport: "train",
  oneWayFare: 220,
};

describe("toRouteFormValues", () => {
  it("運賃を文字列にして、ほかの欄はそのまま入れる", () => {
    expect(toRouteFormValues(route)).toEqual({
      name: "自宅↔本社",
      from: "中野",
      to: "東京",
      transport: "train",
      oneWayFare: "220",
    });
  });
});

describe("toRouteInput", () => {
  it("運賃の文字列を数にする（前後の空白は無視する）", () => {
    const input = toRouteInput({ ...toRouteFormValues(route), oneWayFare: " 1200 " });
    expect(input.oneWayFare).toBe(1200);
  });

  it("空や数でない運賃は NaN にし、JSON では null として送られる（判定は API に任せる）", () => {
    expect(toRouteInput(emptyRouteForm).oneWayFare).toBeNaN();
    const input = toRouteInput({ ...emptyRouteForm, oneWayFare: "abc" });
    expect(JSON.parse(JSON.stringify(input)).oneWayFare).toBeNull();
  });

  it("フォームから戻した値は、元のルートの値と同じになる", () => {
    expect(toRouteInput(toRouteFormValues(route))).toEqual({
      name: route.name,
      from: route.from,
      to: route.to,
      transport: route.transport,
      oneWayFare: route.oneWayFare,
    });
  });
});

describe("toRouteFormErrors", () => {
  it("API の fieldErrors を欄ごとに振り分ける。1つの欄には最初の文だけを使う", () => {
    const result = toRouteFormErrors([
      { field: "name", message: "ルート名を入力してください" },
      { field: "oneWayFare", message: "片道運賃は0以上の整数（円）で入力してください" },
      { field: "name", message: "2つめ" },
    ]);
    expect(result.byField).toEqual({
      name: "ルート名を入力してください",
      oneWayFare: "片道運賃は0以上の整数（円）で入力してください",
    });
    expect(result.other).toEqual([]);
  });

  it("欄に結び付かないエラーは other に集める", () => {
    const result = toRouteFormErrors([{ field: "", message: "JSON のオブジェクトを送ってください" }]);
    expect(result.byField).toEqual({});
    expect(result.other).toEqual(["JSON のオブジェクトを送ってください"]);
  });

  it("fieldErrors が無ければ、どちらも空", () => {
    expect(toRouteFormErrors(undefined)).toEqual({ byField: {}, other: [] });
  });
});

describe("formatYen", () => {
  it("3桁ごとに区切って円を付ける", () => {
    expect(formatYen(1200)).toBe("1,200円");
    expect(formatYen(0)).toBe("0円");
  });
});
