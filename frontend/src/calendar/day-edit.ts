import {
  weekdayOf,
  type ApiError,
  type DailyRecord,
  type DateString,
  type WorkStyle,
  type WorkStyleInput,
} from "@routepense/shared";
import { WEEKDAY_LABELS } from "./month";

/**
 * 日の編集パネルで選べるもの。勤務区分（API に送る形）に「未入力に戻す」を足したユニオン型。
 * 「未入力」は勤務区分ではない（記録を消すこと）なので、WorkStyleInput の中には入れず、外に足す。
 */
export type DayChoice = WorkStyleInput | { kind: "unentered" };

/** 記録から、今選ばれているものを返す。記録が無ければ未入力 */
export function choiceOf(record: DailyRecord | undefined): DayChoice {
  if (!record) return { kind: "unentered" };
  return toWorkStyleInput(record.workStyle);
}

/** 保存済みの勤務区分を、API に送る形に戻す（出勤はルートの値を落として routeId だけにする） */
export function toWorkStyleInput(workStyle: WorkStyle): WorkStyleInput {
  return workStyle.kind === "commute" ? { kind: "commute", routeId: workStyle.routeId } : { kind: workStyle.kind };
}

/** 2つの選択が同じか。出勤はルートまで同じときだけ同じとみなす */
export function isSameChoice(a: DayChoice, b: DayChoice): boolean {
  if (a.kind === "commute" && b.kind === "commute") return a.routeId === b.routeId;
  return a.kind === b.kind;
}

/**
 * 保存した記録を一覧に入れる（同じ日があれば置き換え、無ければ足す）。
 * 元の配列は変えずに新しい配列を返す。React の state は、新しい値を渡したときだけ描き直されるため。
 */
export function upsertRecord(records: readonly DailyRecord[], record: DailyRecord): DailyRecord[] {
  return [...records.filter((r) => r.date !== record.date), record].sort((a, b) => a.date.localeCompare(b.date));
}

/** その日の記録を一覧から除く（未入力に戻したとき） */
export function removeRecord(records: readonly DailyRecord[], date: DateString): DailyRecord[] {
  return records.filter((r) => r.date !== date);
}

/** API のエラーを、パネルに出す1つの文にする。項目ごとの理由があれば添える */
export function errorMessage(error: ApiError): string {
  const details = error.fieldErrors?.map((e) => e.message) ?? [];
  return [error.error, ...details].join("。");
}

/** パネルの見出し用の日付（例: 11月2日（月）） */
export function dayLabel(date: DateString): string {
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return `${month}月${day}日（${WEEKDAY_LABELS[weekdayOf(date)]}）`;
}
