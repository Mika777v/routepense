import type { DailyRecord } from "./daily-record";
import type { ExtraTrip } from "./extra-trip";
import type { WorkStyle } from "./work-style";

/**
 * ここに来ることは無い、と型で示すための関数。
 * switch で全部の kind を扱っていれば、残りの値の型は never（あり得ない値の型）になる。
 * kind を増やして case を書き忘れると、ここで型エラーになる。
 */
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

/** 勤務区分による通常の交通費。出勤は常に往復（片道運賃 × 2） */
export function workStyleFare(workStyle: WorkStyle): number {
  switch (workStyle.kind) {
    case "remote":
      return 0;
    case "commute":
      // この case の中では、workStyle は { kind: "commute"; routeId; route } の型に絞り込まれている
      return workStyle.route.oneWayFare * 2;
    case "holiday":
      return 0;
    default:
      return assertNever(workStyle);
  }
}

/** 追加の移動1件の金額。往復なら片道運賃 × 2 */
export function extraTripFare(trip: ExtraTrip): number {
  switch (trip.tripType) {
    case "oneWay":
      return trip.oneWayFare;
    case "roundTrip":
      return trip.oneWayFare * 2;
    default:
      return assertNever(trip.tripType);
  }
}

/** その日の交通費 = 勤務区分の交通費 + 追加の移動の合計 */
export function dailyFare(record: Pick<DailyRecord, "workStyle" | "extraTrips">): number {
  const extra = record.extraTrips.reduce((sum, trip) => sum + extraTripFare(trip), 0);
  return workStyleFare(record.workStyle) + extra;
}

/** 月の交通費の合計と、その内訳 */
export type MonthlyFare = {
  /** 月の合計（= 通常の交通費 + 追加の移動） */
  total: number;
  /** 勤務区分による通常の交通費の合計 */
  workStyleTotal: number;
  /** 追加の移動の合計 */
  extraTotal: number;
};

/**
 * 月の交通費の合計（純粋関数）。records はその月の日次記録。
 * 合計は1日の交通費（dailyFare）を足したものにし、カレンダーの各日の金額と必ず合うようにする。
 * 内訳の通常の交通費は workStyleFare を足し、追加の移動は合計との差にする。
 */
export function monthlyFare(records: readonly Pick<DailyRecord, "workStyle" | "extraTrips">[]): MonthlyFare {
  // reduce は配列を1つの値にまとめる。第2引数が最初の値（ここでは 0 円の合計）
  const sums = records.reduce(
    (acc, record) => ({
      total: acc.total + dailyFare(record),
      workStyleTotal: acc.workStyleTotal + workStyleFare(record.workStyle),
    }),
    { total: 0, workStyleTotal: 0 },
  );
  return { ...sums, extraTotal: sums.total - sums.workStyleTotal };
}
