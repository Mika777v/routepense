import type { DateString, Weekday } from "./date";
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
