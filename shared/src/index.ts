// フロントとバックの両方が使う型と、どちらでも使う純粋関数を置く場所。

export type { BulkInput } from "./bulk";
export type { DailyRecord } from "./daily-record";
export type { DateString, Weekday } from "./date";
export type { ExtraTrip, TripType } from "./extra-trip";
export { assertNever, dailyFare, extraTripFare, workStyleFare } from "./fare";
export type { Route, RouteSnapshot, Transport } from "./route";
export type { WorkStyle, WorkStyleKind } from "./work-style";

/** GET /api/health の応答。フロントとバックが同じ型を使うことを確かめるための最小の例 */
export type HealthResponse = {
  status: "ok";
  time: string;
};
