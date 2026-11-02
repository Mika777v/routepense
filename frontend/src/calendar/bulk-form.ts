import {
  HOLIDAYS,
  type BulkPreviewRequest,
  type DateString,
  type FieldError,
  type Route,
  type Weekday,
  type WorkStyleInput,
} from "@routepense/shared";
import { WEEK_ORDER, daysInMonth, type MonthString } from "./month";

/** 一括設定ダイアログの欄の値。勤務区分は、ラジオボタンの種類と、出勤のときのルートに分けて持つ */
export type BulkFormValues = {
  startDate: DateString;
  endDate: DateString;
  weekdays: Weekday[];
  /** 祝日を除くか（要件定義 F3。最初から ON） */
  skipHolidays: boolean;
  kind: WorkStyleInput["kind"];
  /** 出勤のときに使うルート（ほかの種類では使わない） */
  routeId: string;
};

/** エラーを出す欄 */
export type BulkFormField = "startDate" | "endDate" | "weekdays" | "workStyle";
export type BulkFormErrors = Partial<Record<BulkFormField, string>>;

/** 曜日をまとめて入れるボタン */
export const WEEKDAY_PRESETS = {
  平日: [1, 2, 3, 4, 5],
  土日: [6, 0],
  毎日: [1, 2, 3, 4, 5, 6, 0],
} as const satisfies Record<string, readonly Weekday[]>;

/**
 * ダイアログを開いたときの値。期間は表示中の月の1日〜末日、曜日は平日、祝日は除く。
 * ルートがあれば出勤（最初のルート）、無ければ在宅を選んでおく。
 */
export function initialBulkForm(month: MonthString, routes: readonly Route[]): BulkFormValues {
  const first = routes[0];
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(daysInMonth(month)).padStart(2, "0")}`,
    weekdays: [...WEEKDAY_PRESETS.平日],
    skipHolidays: true,
    kind: first ? "commute" : "remote",
    routeId: first?.id ?? "",
  };
}

/** 曜日のチェックを入れたり外したりする。並びはカレンダーと同じ（月〜日）にそろえる */
export function toggleWeekday(weekdays: readonly Weekday[], weekday: Weekday): Weekday[] {
  const next = weekdays.includes(weekday) ? weekdays.filter((w) => w !== weekday) : [...weekdays, weekday];
  return [...next].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b));
}

/** 欄の値を、下見の API に送る形にする。正しいかどうかは API が判定する */
export function toBulkPreviewRequest(values: BulkFormValues): BulkPreviewRequest {
  const workStyle: WorkStyleInput =
    values.kind === "commute" ? { kind: "commute", routeId: values.routeId } : { kind: values.kind };
  const { startDate, endDate, weekdays, skipHolidays } = values;
  return { startDate, endDate, weekdays, skipHolidays, workStyle };
}

/**
 * 期間の中の祝日を、チェックの横に出す形（例: 11/3 文化の日）で古い順に返す（純粋関数）。
 * 曜日の条件は見ない（日曜の祝日も出す）。期間が逆さま、または日付の欄が空なら空の配列。
 */
export function holidaysInRange(startDate: DateString, endDate: DateString): string[] {
  // 欄が空（""）だと、"" <= "2026-01-01" が成り立って一覧の最初からの祝日を拾ってしまうので、先に除く
  if (startDate === "" || endDate === "") return [];
  // HOLIDAYS は古い順に並んでいる（shared のテストで確かめている）。YYYY-MM-DD は文字列のまま大小を比べられる
  return [...HOLIDAYS]
    .filter(([date]) => startDate <= date && date <= endDate)
    .map(([date, name]) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))} ${name}`);
}

/** API の項目の名前を、欄の名前に変える（"workStyle.routeId" も勤務区分の欄に出す） */
function formFieldOf(field: string): BulkFormField | undefined {
  if (field === "startDate" || field === "endDate" || field === "weekdays") return field;
  if (field === "workStyle" || field.startsWith("workStyle.")) return "workStyle";
  return undefined;
}

/** API が返した fieldErrors を、欄ごとのエラーの文に変える。欄に結び付かないものは other に集める */
export function toBulkFormErrors(fieldErrors: readonly FieldError[] | undefined): {
  byField: BulkFormErrors;
  other: string[];
} {
  const byField: BulkFormErrors = {};
  const other: string[] = [];
  for (const { field, message } of fieldErrors ?? []) {
    const formField = formFieldOf(field);
    if (formField) byField[formField] ??= message;
    else other.push(message);
  }
  return { byField, other };
}
