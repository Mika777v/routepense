/**
 * 日付を表す文字列（YYYY-MM-DD）。
 * Date オブジェクトを使わず文字列で持つのは、タイムゾーンによって日付がずれるのを避けるため。
 * 形式が正しいかは API の受け口（バリデーション）で確かめる。
 */
export type DateString = string;

/** 曜日。0 = 日曜 〜 6 = 土曜（JavaScript の Date#getDay() と同じ並び） */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * YYYY-MM-DD を年・月・日の数に分ける（月は 1〜12）。
 * split("-") で分けると、配列の要素の型が number | undefined になる（tsconfig の noUncheckedIndexedAccess）。
 * 形式は桁数で決まっているので、slice で位置を指定して取り出す。
 */
function parseDate(date: DateString): { year: number; month: number; day: number } {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

/**
 * 日付の曜日を返す。
 * Date.UTC で「その日の 0 時（UTC）」を作り、getUTCDay で曜日を読む。
 * new Date("2026-11-02") や getDay() は、動かす環境のタイムゾーンで結果が変わることがあるので使わない。
 */
export function weekdayOf(date: DateString): Weekday {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday;
}

/** 次の日を返す（月末なら翌月の1日、12月31日なら翌年の1月1日） */
export function nextDate(date: DateString): DateString {
  const { year, month, day } = parseDate(date);
  // 日に 32 などはみ出した値を渡しても、Date.UTC が翌月に繰り上げてくれる
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}
