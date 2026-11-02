// フロントとバックの両方が使う型と、どちらでも使う純粋関数を置く場所。

export type { ApiError, FieldError } from "./api";
export type { BulkInput, BulkPreviewRequest, BulkSaveRequest } from "./bulk";
export { bulkTargetDates } from "./bulk";
export type { DailyRecord, DailyRecordInput } from "./daily-record";
export type { DateString, Weekday } from "./date";
export { nextDate, weekdayOf } from "./date";
export { HOLIDAY_YEARS, HOLIDAYS, holidayName } from "./holidays";
export type { ExtraTrip, ExtraTripInput, TripType } from "./extra-trip";
export type { MonthlyFare } from "./fare";
export { assertNever, dailyFare, extraTripFare, monthlyFare, workStyleFare } from "./fare";
export type { Route, RouteInput, RouteSnapshot, Transport } from "./route";
export { TRANSPORTS } from "./route";
export type { WorkStyle, WorkStyleInput, WorkStyleKind } from "./work-style";

/** GET /api/health の応答。フロントとバックが同じ型を使うことを確かめるための最小の例 */
export type HealthResponse = {
  status: "ok";
  time: string;
};

export type { BulkApplyResult, DailyRecordDraft } from "./bulk-apply";
export { applyBulk } from "./bulk-apply";
