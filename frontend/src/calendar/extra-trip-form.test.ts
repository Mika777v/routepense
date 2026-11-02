import type { DailyRecord, ExtraTrip, Route } from "@routepense/shared";
import { describe, expect, it } from "vitest";
import {
  emptyExtraTripForm,
  fillFromRoute,
  previewFare,
  toExtraTripFormErrors,
  toExtraTripFormValues,
  toExtraTripInput,
  withTrip,
  withoutTrip,
} from "./extra-trip-form";

const route: Route = { id: "r2", userId: "u1", name: "自宅↔客先A", from: "中野", to: "品川", transport: "train", oneWayFare: 310 };
const trip: ExtraTrip = { id: "t1", from: "中野", to: "新宿", transport: "train", oneWayFare: 170, tripType: "roundTrip" };
const record: DailyRecord = { id: "d1", userId: "u1", date: "2026-11-02", workStyle: { kind: "remote" }, extraTrips: [trip] };

describe("fillFromRoute", () => {
  it("区間・交通手段・運賃をコピーし、片道 / 往復と目的は残す", () => {
    const values = fillFromRoute({ ...emptyExtraTripForm, tripType: "oneWay", purpose: "打合せ" }, route);
    expect(values).toEqual({
      from: "中野",
      to: "品川",
      transport: "train",
      oneWayFare: "310",
      tripType: "oneWay",
      purpose: "打合せ",
      sourceRouteId: "r2",
    });
  });
});

describe("toExtraTripInput", () => {
  it("運賃を数にし、空の任意項目は送らない", () => {
    expect(toExtraTripInput({ ...emptyExtraTripForm, from: "中野", to: "新宿", oneWayFare: " 170 " })).toEqual({
      from: "中野",
      to: "新宿",
      transport: "train",
      oneWayFare: 170,
      tripType: "roundTrip",
    });
  });

  it("目的と元のルートがあれば送る。空の運賃は NaN（API が欄のエラーを返す）", () => {
    const input = toExtraTripInput({ ...fillFromRoute(emptyExtraTripForm, route), oneWayFare: "", purpose: " 客先B " });
    expect(input).toMatchObject({ purpose: "客先B", sourceRouteId: "r2" });
    expect(input.oneWayFare).toBeNaN();
  });

  it("登録済みの移動をフォームにして戻すと、同じ値になる", () => {
    expect({ ...toExtraTripInput(toExtraTripFormValues(trip)), id: trip.id }).toEqual(trip);
  });
});

describe("previewFare", () => {
  it("往復は片道運賃 × 2", () => {
    expect(previewFare({ oneWayFare: "170", tripType: "roundTrip" })).toBe(340);
    expect(previewFare({ oneWayFare: "170", tripType: "oneWay" })).toBe(170);
  });

  it("整数として読めなければ null", () => {
    expect(previewFare({ oneWayFare: "", tripType: "oneWay" })).toBeNull();
    expect(previewFare({ oneWayFare: "1.5", tripType: "oneWay" })).toBeNull();
  });
});

describe("toExtraTripFormErrors", () => {
  it("欄に結び付くものと、そうでないものに分ける", () => {
    expect(
      toExtraTripFormErrors([
        { field: "from", message: "出発地を入力してください" },
        { field: "", message: "日次記録が見つかりません" },
      ]),
    ).toEqual({ byField: { from: "出発地を入力してください" }, other: ["日次記録が見つかりません"] });
  });
});

describe("withTrip・withoutTrip", () => {
  it("同じ id なら置き換え、無ければ末尾に足す。元の記録は変えない", () => {
    const changed = { ...trip, oneWayFare: 200 };
    expect(withTrip(record, changed).extraTrips).toEqual([changed]);
    const added = { ...trip, id: "t2" };
    expect(withTrip(record, added).extraTrips.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(record.extraTrips).toEqual([trip]);
  });

  it("移動を除く", () => {
    expect(withoutTrip(record, "t1").extraTrips).toEqual([]);
  });
});
