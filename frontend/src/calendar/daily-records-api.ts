import type {
  BulkApplyResult,
  BulkPreviewRequest,
  BulkSaveRequest,
  DailyRecord,
  DailyRecordInput,
  DateString,
  WorkStyleInput,
} from "@routepense/shared";
import { request, type ApiResult } from "../api-client";
import type { MonthString } from "./month";

/** GET /api/daily-records?month=YYYY-MM: その月の日次記録（記録のある日だけ） */
export function listDailyRecords(month: MonthString): Promise<ApiResult<DailyRecord[]>> {
  return request<DailyRecord[]>(`/api/daily-records?month=${encodeURIComponent(month)}`);
}

function recordUrl(date: DateString): string {
  return `/api/daily-records/${encodeURIComponent(date)}`;
}

/** PUT /api/daily-records/:date: その日の勤務区分を保存する（無ければ作る）。出勤は routeId だけを送る */
export function saveDailyRecord(date: DateString, workStyle: WorkStyleInput): Promise<ApiResult<DailyRecord>> {
  const body: DailyRecordInput = { workStyle };
  return request<DailyRecord>(recordUrl(date), { method: "PUT", body: JSON.stringify(body) });
}

/** DELETE /api/daily-records/:date: その日の記録を消して「未入力」に戻す（追加の移動も消える） */
export function deleteDailyRecord(date: DateString): Promise<ApiResult<undefined>> {
  return request<undefined>(recordUrl(date), { method: "DELETE" });
}

/** POST /api/daily-records/bulk/preview: 一括設定の下見（保存しない）。当てはめた結果を返す */
export function previewBulk(input: BulkPreviewRequest): Promise<ApiResult<BulkApplyResult>> {
  return request<BulkApplyResult>("/api/daily-records/bulk/preview", { method: "POST", body: JSON.stringify(input) });
}

/** POST /api/daily-records/bulk: 日ごとの勤務区分をまとめて保存する。追加の移動は残る */
export function saveBulk(input: BulkSaveRequest): Promise<ApiResult<DailyRecord[]>> {
  return request<DailyRecord[]>("/api/daily-records/bulk", { method: "POST", body: JSON.stringify(input) });
}
