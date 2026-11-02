import { TRANSPORTS, type FieldError, type Transport } from "@routepense/shared";

/** 文字の項目の長さの上限 */
export const MAX_TEXT = 100;
/** URL の長さの上限。ブラウザやサーバーが扱える長さの目安（2000文字） */
export const MAX_URL = 2000;
/** 片道運賃の上限（円）。桁の打ち間違いを防ぐための目安 */
export const MAX_FARE = 100_000;

/** JSON のオブジェクト（配列と null を除く）かどうか */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isTransport(value: unknown): value is Transport {
  return typeof value === "string" && (TRANSPORTS as readonly string[]).includes(value);
}

/** 必須の文字列。前後の空白は取り除く */
export function text(
  body: Record<string, unknown>,
  field: string,
  label: string,
  errors: FieldError[],
): string {
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

/** 任意の文字列。無い・空なら undefined。前後の空白は取り除く */
export function optionalText(
  body: Record<string, unknown>,
  field: string,
  label: string,
  errors: FieldError[],
): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    errors.push({ field, message: `${label}は文字で入力してください` });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEXT) {
    errors.push({ field, message: `${label}は${MAX_TEXT}文字以内で入力してください` });
  }
  return trimmed === "" ? undefined : trimmed;
}

/** 交通手段。誤りなら undefined */
export function transport(
  body: Record<string, unknown>,
  field: string,
  errors: FieldError[],
): Transport | undefined {
  const value = body[field];
  if (!isTransport(value)) {
    errors.push({ field, message: "交通手段は電車・バス・その他から選んでください" });
    return undefined;
  }
  return value;
}

/** 片道運賃（0 以上 MAX_FARE 以下の整数）。誤りなら undefined */
export function fare(
  body: Record<string, unknown>,
  field: string,
  errors: FieldError[],
): number | undefined {
  const value = body[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    errors.push({ field, message: "片道運賃は0以上の整数（円）で入力してください" });
    return undefined;
  }
  if (value > MAX_FARE) {
    errors.push({
      field,
      message: `片道運賃は${MAX_FARE.toLocaleString("ja-JP")}円以下で入力してください`,
    });
  }
  return value;
}

/**
 * 任意の URL。無い・空なら undefined。前後の空白は取り除く。
 * 画面でリンクとして開くので、http: と https: だけを受け付ける（javascript: などのリンクを防ぐ）
 */
export function optionalUrl(
  body: Record<string, unknown>,
  field: string,
  label: string,
  errors: FieldError[],
): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    errors.push({ field, message: `${label}は文字で入力してください` });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  if (trimmed.length > MAX_URL) {
    errors.push({ field, message: `${label}は${MAX_URL}文字以内で入力してください` });
    return undefined;
  }
  if (!/^https?:\/\//i.test(trimmed) || !URL.canParse(trimmed)) {
    errors.push({ field, message: `${label}は http:// か https:// で始まる URL を入力してください` });
    return undefined;
  }
  return trimmed;
}
