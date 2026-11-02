import type { DailyRecord } from "@routepense/shared";
import { request, type ApiResult } from "../api-client";
import type { MonthString } from "./month";

/** GET /api/daily-records?month=YYYY-MM: その月の日次記録（記録のある日だけ） */
export function listDailyRecords(month: MonthString): Promise<ApiResult<DailyRecord[]>> {
  return request<DailyRecord[]>(`/api/daily-records?month=${encodeURIComponent(month)}`);
}
