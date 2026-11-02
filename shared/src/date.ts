/**
 * 日付を表す文字列（YYYY-MM-DD）。
 * Date オブジェクトを使わず文字列で持つのは、タイムゾーンによって日付がずれるのを避けるため。
 * 形式が正しいかは API の受け口（バリデーション）で確かめる。
 */
export type DateString = string;

/** 曜日。0 = 日曜 〜 6 = 土曜（JavaScript の Date#getDay() と同じ並び） */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
