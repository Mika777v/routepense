import type { BulkPreviewRequest, DateString, FieldError, Route, Weekday, WorkStyleInput } from "@routepense/shared";
import { WEEK_ORDER, daysInMonth, type MonthString } from "./month";

/** 一括設定ダイアログの欄の値。勤務区分は、ラジオボタンの種類と、出勤のときのルートに分けて持つ */
export type BulkFormValues = {
  startDate: DateString;
  endDate: DateString;
  weekdays: Weekday[];
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
 * ダイアログを開いたときの値。期間は表示中の月の1日〜末日、曜日は平日。
 * ルートがあれば出勤（最初のルート）、無ければ在宅を選んでおく。
 */
export function initialBulkForm(month: MonthString, routes: readonly Route[]): BulkFormValues {
  const first = routes[0];
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(daysInMonth(month)).padStart(2, "0")}`,
    weekdays: [...WEEKDAY_PRESETS.平日],
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
  // 祝日を除くかのチェックは #49 で置く。それまでは、要件定義 F3 の最初の値（除く）を送る
  return { startDate: values.startDate, endDate: values.endDate, weekdays: values.weekdays, skipHolidays: true, workStyle };
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
