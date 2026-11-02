import { nextDate, weekdayOf, type DateString, type Weekday } from "./date";
import { holidayName } from "./holidays";
import type { WorkStyle, WorkStyleInput } from "./work-style";

/** 一括設定の入力 */
export type BulkInput = {
  startDate: DateString;
  /** 開始日以降で、開始日と同じ月 */
  endDate: DateString;
  /** 対象の曜日（1つ以上） */
  weekdays: Weekday[];
  /** 祝日を除くか（要件定義 F3）。true なら、曜日が合っても祝日には当てはめない */
  skipHolidays: boolean;
  workStyle: WorkStyle;
};

/**
 * 一括設定の対象の日付を、古い順に返す（純粋関数）。
 * 開始日から終了日までの日のうち、曜日が weekdays に含まれる日だけを選ぶ。
 * skipHolidays が true なら、祝日（shared/src/holidays.ts の一覧にある日）を除く。
 *
 * 入力が正しいか（日付が実在する・同じ月の中・曜日が1つ以上）は、API の受け口で確かめる。
 * ここでは、開始日が終了日より後なら空の配列を返すだけにする。
 */
export function bulkTargetDates(
  input: Pick<BulkInput, "startDate" | "endDate" | "weekdays" | "skipHolidays">,
): DateString[] {
  const result: DateString[] = [];
  // YYYY-MM-DD は桁数がそろっているので、文字列のまま大小を比べられる
  for (let date = input.startDate; date <= input.endDate; date = nextDate(date)) {
    const skipped = input.skipHolidays && holidayName(date) !== undefined;
    if (input.weekdays.includes(weekdayOf(date)) && !skipped) {
      result.push(date);
    }
  }
  return result;
}

/**
 * POST /api/daily-records/bulk/preview の本文。
 * BulkInput と同じだが、出勤は routeId だけを送る（ルートの値はサーバーがコピーする）。
 */
export type BulkPreviewRequest = Omit<BulkInput, "workStyle"> & { workStyle: WorkStyleInput };

/** POST /api/daily-records/bulk の本文。カレンダーで直した後の、日ごとの勤務区分 */
export type BulkSaveRequest = {
  days: { date: DateString; workStyle: WorkStyleInput }[];
};
