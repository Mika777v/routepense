import type { DateString } from "@routepense/shared";

/**
 * YYYY-MM-DD の形で、しかも実在する日かどうか。
 * 2026-02-30 のような日は、Date.UTC が 3月2日に繰り上げてしまうので、
 * 作った日付を文字列に戻して、元と同じかで確かめる。
 */
export function isDateString(value: unknown): value is DateString {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value;
}

/** 月を表す YYYY-MM（01〜12 月）かどうか */
export function isMonthString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
