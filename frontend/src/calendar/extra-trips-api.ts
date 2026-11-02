import type { DateString, ExtraTrip, ExtraTripInput } from "@routepense/shared";
import { request, type ApiResult } from "../api-client";

function tripsUrl(date: DateString, tripId?: string): string {
  const base = `/api/daily-records/${encodeURIComponent(date)}/extra-trips`;
  return tripId === undefined ? base : `${base}/${encodeURIComponent(tripId)}`;
}

/** POST .../extra-trips: その日に追加の移動を足す（その日の記録が無ければ 404） */
export function addExtraTrip(date: DateString, input: ExtraTripInput): Promise<ApiResult<ExtraTrip>> {
  return request<ExtraTrip>(tripsUrl(date), { method: "POST", body: JSON.stringify(input) });
}

/** PUT .../extra-trips/:tripId: 追加の移動を直す */
export function updateExtraTrip(date: DateString, tripId: string, input: ExtraTripInput): Promise<ApiResult<ExtraTrip>> {
  return request<ExtraTrip>(tripsUrl(date, tripId), { method: "PUT", body: JSON.stringify(input) });
}

/** DELETE .../extra-trips/:tripId: 追加の移動を消す */
export function deleteExtraTrip(date: DateString, tripId: string): Promise<ApiResult<undefined>> {
  return request<undefined>(tripsUrl(date, tripId), { method: "DELETE" });
}
