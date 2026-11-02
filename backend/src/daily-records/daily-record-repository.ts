import type { DailyRecord, DateString, ExtraTrip, WorkStyle } from "@routepense/shared";

/** 追加の移動を足すときに渡す値（id はサーバーが決める） */
export type ExtraTripInput = Omit<ExtraTrip, "id">;

/**
 * 日次記録の保存と読み出しの窓口（RouteRepository と同じ考え方）。
 * 月は "YYYY-MM" の文字列で渡す。
 */
export interface DailyRecordRepository {
  /** その月の記録を、日付の古い順に返す（追加の移動を含む） */
  listByMonth(userId: string, month: string): DailyRecord[];
  get(userId: string, date: DateString): DailyRecord | undefined;
  /**
   * その日の勤務区分を保存する。記録が無ければ作り、あれば勤務区分だけを置き換える。
   * 追加の移動は残す。
   */
  saveWorkStyle(userId: string, date: DateString, workStyle: WorkStyle): DailyRecord;
  /** その日の記録を消して「未入力」に戻す（追加の移動も消える）。消せたら true */
  delete(userId: string, date: DateString): boolean;
  /** その日の記録に追加の移動を足す。記録が無ければ undefined */
  addExtraTrip(userId: string, date: DateString, input: ExtraTripInput): ExtraTrip | undefined;
}
