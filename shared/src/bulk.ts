import { nextDate, weekdayOf, type DateString, type Weekday } from "./date";
import type { WorkStyle } from "./work-style";

/** 一括設定の入力 */
export type BulkInput = {
  startDate: DateString;
  /** 開始日以降で、開始日と同じ月 */
  endDate: DateString;
  /** 対象の曜日（1つ以上） */
  weekdays: Weekday[];
  workStyle: WorkStyle;
};

/**
 * 一括設定の対象の日付を、古い順に返す（純粋関数）。
 * 開始日から終了日までの日のうち、曜日が weekdays に含まれる日だけを選ぶ。
 *
 * 入力が正しいか（日付が実在する・同じ月の中・曜日が1つ以上）は、API の受け口で確かめる。
 * ここでは、開始日が終了日より後なら空の配列を返すだけにする。
 */
export function bulkTargetDates(
  input: Pick<BulkInput, "startDate" | "endDate" | "weekdays">,
): DateString[] {
  const result: DateString[] = [];
  // YYYY-MM-DD は桁数がそろっているので、文字列のまま大小を比べられる
  for (let date = input.startDate; date <= input.endDate; date = nextDate(date)) {
    if (input.weekdays.includes(weekdayOf(date))) {
      result.push(date);
    }
  }
  return result;
}
