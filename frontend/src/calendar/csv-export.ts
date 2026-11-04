import { csvFileName, monthCsv, type DailyRecord } from "@routepense/shared";
import type { MonthString } from "./month";

/** 保存する CSV ファイルの中身（要件定義 F7）。ファイルにする前の純粋な部分なので、テストできる */
export type CsvFile = { fileName: string; text: string };

/** 表示中の月の保存済みの記録から、CSV ファイルの名前と中身を作る（当てはめ中の内容は渡さない） */
export function buildCsvFile(month: MonthString, saved: readonly DailyRecord[]): CsvFile {
  return { fileName: csvFileName(month), text: monthCsv(saved) };
}

/**
 * ボタンの横に出す説明。null なら何も出さない。
 * 当てはめ中は保存できない理由を、未入力の日があれば CSV に入らないことを伝える（U10）。
 */
export function csvExportNote(hasDraft: boolean, unentered: number): string | null {
  if (hasDraft) return "当てはめ中は CSV で保存できません。先に登録するか、取り消してください";
  if (unentered > 0) return `未入力の日（${unentered}日）は CSV に入りません`;
  return null;
}
