import type { Route, RouteInput } from "@routepense/shared";
import { request as requestUrl, type ApiResult } from "../api-client";

const BASE = "/api/routes";

function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  return requestUrl<T>(`${BASE}${path}`, init);
}

export function listRoutes(): Promise<ApiResult<Route[]>> {
  return request<Route[]>("");
}

export function createRoute(input: RouteInput): Promise<ApiResult<Route>> {
  return request<Route>("", { method: "POST", body: JSON.stringify(input) });
}

export function updateRoute(id: string, input: RouteInput): Promise<ApiResult<Route>> {
  return request<Route>(`/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteRoute(id: string): Promise<ApiResult<undefined>> {
  return request<undefined>(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}
