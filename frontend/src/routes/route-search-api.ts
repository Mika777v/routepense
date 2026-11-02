import type { RouteSearchResponse, RouteSearchStatus } from "@routepense/shared";
import { request, type ApiResult } from "../api-client";

const BASE = "/api/route-search";

/** この環境で経路検索が使えるか（API のキーが設定されているか）を聞く */
export function getRouteSearchStatus(): Promise<ApiResult<RouteSearchStatus>> {
  return request<RouteSearchStatus>(`${BASE}/status`);
}

/**
 * 出発駅・到着駅から、経路結果のページの URL を受け取る。
 * 駅名はクエリ文字列に入れるので、URLSearchParams で日本語や記号を符号化する。
 */
export function searchRoute(from: string, to: string): Promise<ApiResult<RouteSearchResponse>> {
  const query = new URLSearchParams({ from, to });
  return request<RouteSearchResponse>(`${BASE}?${query.toString()}`);
}
