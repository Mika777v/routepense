import type { ApiError, Route, RouteInput } from "@routepense/shared";

/**
 * API を呼んだ結果。成功なら値、失敗なら API が返したエラー（ApiError）を持つ。
 * 例外を投げずに戻り値で返すので、呼ぶ側は ok を見て必ず両方の場合を書くことになる。
 */
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };

const BASE = "/api/routes";

/** 応答を ApiResult に変える。通信そのものの失敗（backend が止まっているなど）もエラーとして返す */
async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return { ok: false, error: { error: "サーバーに接続できません。backend が起動しているか確かめてください" } };
  }

  if (res.status === 204) {
    // 本文の無い成功（削除）。T は undefined のときにだけ使う
    return { ok: true, value: undefined as T };
  }
  if (!res.ok) {
    // backend は ApiError の形で返す決まり（shared/src/api.ts）。形が違っても画面が壊れないよう、既定の文を用意する
    const body = (await res.json().catch(() => null)) as ApiError | null;
    return { ok: false, error: body ?? { error: `エラーが起きました（HTTP ${res.status}）` } };
  }
  return { ok: true, value: (await res.json()) as T };
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
