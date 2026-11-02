import type { FieldError } from "@routepense/shared";
import { MAX_TEXT } from "../validation/fields";
import type { Result } from "../validation/result";
import type { RouteSearchQuery } from "./route-search";

/**
 * クエリ文字列（?from=…&to=…）を確かめ、RouteSearchQuery に変える。
 * Express のクエリは、同じ名前が2つあると配列になるなど、文字列とは限らないので unknown で受ける。
 */
export function parseRouteSearchQuery(query: Record<string, unknown>): Result<RouteSearchQuery> {
  const errors: FieldError[] = [];
  const from = stationName(query, "from", "出発駅", errors);
  const to = stationName(query, "to", "到着駅", errors);
  if (errors.length === 0 && from === to) {
    errors.push({ field: "to", message: "到着駅は出発駅と別の駅を入力してください" });
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { from, to } };
}

function stationName(query: Record<string, unknown>, field: string, label: string, errors: FieldError[]): string {
  const value = query[field];
  if (typeof value !== "string" || value.trim() === "") {
    errors.push({ field, message: `${label}を入力してください` });
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEXT) {
    errors.push({ field, message: `${label}は${MAX_TEXT}文字以内で入力してください` });
  }
  return trimmed;
}
