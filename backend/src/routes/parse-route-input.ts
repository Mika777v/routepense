import { TRANSPORTS, type RouteInput, type Transport } from "@routepense/shared";
import type { FieldError } from "@routepense/shared";
import type { Result } from "../validation/result";

const MAX_TEXT = 100;
/** 片道運賃の上限（円）。桁の打ち間違いを防ぐための目安 */
const MAX_FARE = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTransport(value: unknown): value is Transport {
  return typeof value === "string" && (TRANSPORTS as readonly string[]).includes(value);
}

/** 必須の文字列。前後の空白は取り除く */
function text(body: Record<string, unknown>, field: string, label: string, errors: FieldError[]): string {
  const value = body[field];
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

/**
 * API に届いた本文（中身が分からない unknown）を確かめ、RouteInput に変える。
 * 型は実行するときに消えるので、外から来た値は、ここで1つずつ確かめる必要がある。
 */
export function parseRouteInput(body: unknown): Result<RouteInput> {
  if (!isRecord(body)) {
    return { ok: false, errors: [{ field: "", message: "JSON のオブジェクトを送ってください" }] };
  }

  const errors: FieldError[] = [];
  const name = text(body, "name", "ルート名", errors);
  const from = text(body, "from", "出発地", errors);
  const to = text(body, "to", "到着地", errors);

  const transport = body.transport;
  if (!isTransport(transport)) {
    errors.push({ field: "transport", message: "交通手段は電車・バス・その他から選んでください" });
  }

  const oneWayFare = body.oneWayFare;
  if (typeof oneWayFare !== "number" || !Number.isInteger(oneWayFare) || oneWayFare < 0) {
    errors.push({ field: "oneWayFare", message: "片道運賃は0以上の整数（円）で入力してください" });
  } else if (oneWayFare > MAX_FARE) {
    errors.push({ field: "oneWayFare", message: `片道運賃は${MAX_FARE.toLocaleString("ja-JP")}円以下で入力してください` });
  }

  if (errors.length > 0 || !isTransport(transport) || typeof oneWayFare !== "number") {
    return { ok: false, errors };
  }
  return { ok: true, value: { name, from, to, transport, oneWayFare } };
}
