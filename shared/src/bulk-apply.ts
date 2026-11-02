import type { DailyRecord } from "./daily-record";
import type { DateString } from "./date";
import type { WorkStyle } from "./work-style";

/** 保存する1日分の中身。id と userId は保存するとき（backend）で決める */
export type DailyRecordDraft = Pick<DailyRecord, "date" | "workStyle" | "extraTrips">;

/** 一括設定を当てはめた結果 */
export type BulkApplyResult = {
  /** 対象の日の、保存する記録（日付の古い順） */
  records: DailyRecordDraft[];
  /** すでに記録があり、勤務区分を上書きする日（確認の「◯日分を上書きします」に使う） */
  overwrittenDates: DateString[];
  /** 上書きする日のうち、追加の移動がある日（確認の画面で示す） */
  datesWithExtraTrips: DateString[];
};

/**
 * 一括設定で当てはめる勤務区分を、既存の記録に重ねる（純粋関数）。
 * - 記録が無い日は、追加の移動が0件の記録を新しく作る
 * - 記録がある日は、勤務区分だけを置き換え、追加の移動は残す（要件定義 F3）
 *
 * 引数の配列やオブジェクトは書き換えず、新しいオブジェクトを作って返す。
 */
export function applyBulk(
  targetDates: readonly DateString[],
  workStyle: WorkStyle,
  existing: readonly Pick<DailyRecord, "date" | "extraTrips">[],
): BulkApplyResult {
  // 日付で引けるように Map にしておく（配列を毎回 find するより速く、読みやすい）
  const byDate = new Map(existing.map((record) => [record.date, record]));

  const records: DailyRecordDraft[] = [];
  const overwrittenDates: DateString[] = [];
  const datesWithExtraTrips: DateString[] = [];

  for (const date of [...targetDates].sort()) {
    const current = byDate.get(date);
    if (current === undefined) {
      records.push({ date, workStyle, extraTrips: [] });
      continue;
    }
    overwrittenDates.push(date);
    if (current.extraTrips.length > 0) {
      datesWithExtraTrips.push(date);
    }
    // 配列をコピーしておくと、返した記録を後で変えても既存の記録には響かない
    records.push({ date, workStyle, extraTrips: [...current.extraTrips] });
  }

  return { records, overwrittenDates, datesWithExtraTrips };
}
