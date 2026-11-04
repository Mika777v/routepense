import type { DailyRecord } from "./daily-record";
import { weekdayOf, type DateString, type Weekday } from "./date";
import type { TripType } from "./extra-trip";
import { extraTripFare, workStyleFare } from "./fare";
import { holidayName } from "./holidays";
import type { Transport } from "./route";
import type { WorkStyleKind } from "./work-style";

/**
 * 月の明細の CSV（要件定義 F7・U10）。
 * 1行 = 1つの移動。出勤日の通常ルートで1行、追加の移動1件ごとに1行。移動の無い日は行を作らない。
 * 画面からも backend からも同じ結果になるよう、shared の純粋関数にしている。
 */

/** CSV の1行目（見出し）。列の順番は要件定義 F7 の表と同じ */
export const CSV_HEADER = [
  "日付",
  "曜日",
  "祝日",
  "勤務区分",
  "種別",
  "出発地",
  "到着地",
  "交通手段",
  "片道/往復",
  "片道運賃",
  "金額",
  "ルート名",
  "目的",
] as const;

/** タプルの各要素を string にした型（要素の数はそのまま）。型引数 T を通すと、マップ型がタプルのまま残る */
type AllString<T extends readonly unknown[]> = { -readonly [K in keyof T]: string };

/** 1行の値。見出しと同じ数だけ並ぶ（タプル型にすると、列の数の間違いが型エラーになる） */
export type CsvRow = AllString<typeof CSV_HEADER>;

const WEEKDAY_LABELS: Record<Weekday, string> = { 0: "日", 1: "月", 2: "火", 3: "水", 4: "木", 5: "金", 6: "土" };
const WORK_STYLE_LABELS: Record<WorkStyleKind, string> = { remote: "在宅", commute: "出勤", holiday: "休日" };
const TRANSPORT_LABELS: Record<Transport, string> = { train: "電車", bus: "バス", other: "その他" };
const TRIP_TYPE_LABELS: Record<TripType, string> = { oneWay: "片道", roundTrip: "往復" };

type CsvRecord = Pick<DailyRecord, "date" | "workStyle" | "extraTrips">;

/** 日次記録の一覧から、明細の行（見出しを除く）を作る。日付の順に並べ、同じ日は通常 → 追加の順 */
export function monthCsvRows(records: readonly CsvRecord[]): CsvRow[] {
  // 元の配列は並べ替えない（純粋関数にするため、コピーしてから sort する）
  const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return sorted.flatMap((record) => recordRows(record));
}

function recordRows(record: CsvRecord): CsvRow[] {
  const day = dayColumns(record.date, record.workStyle.kind);
  const rows: CsvRow[] = [];
  const workStyle = record.workStyle;
  if (workStyle.kind === "commute") {
    const { route } = workStyle;
    rows.push([
      ...day,
      "通常",
      route.from,
      route.to,
      TRANSPORT_LABELS[route.transport],
      TRIP_TYPE_LABELS.roundTrip, // 通常ルートは常に往復（要件定義 §5 勤務区分）
      String(route.oneWayFare),
      String(workStyleFare(workStyle)),
      route.name,
      "",
    ]);
  }
  for (const trip of record.extraTrips) {
    rows.push([
      ...day,
      "追加",
      trip.from,
      trip.to,
      TRANSPORT_LABELS[trip.transport],
      TRIP_TYPE_LABELS[trip.tripType],
      String(trip.oneWayFare),
      String(extraTripFare(trip)),
      "",
      trip.purpose ?? "",
    ]);
  }
  return rows;
}

/** 日付・曜日・祝日・勤務区分の4列（その日の行で共通） */
function dayColumns(date: DateString, kind: WorkStyleKind): [string, string, string, string] {
  return [date, WEEKDAY_LABELS[weekdayOf(date)], holidayName(date) ?? "", WORK_STYLE_LABELS[kind]];
}

/**
 * 1つの値を CSV の欄にする（RFC 4180）。
 * カンマ・改行・`"` を含むときだけ `"` で囲み、中の `"` は `""` に重ねる。
 */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/** Excel が UTF-8 だと見分けるための印（BOM: Byte Order Mark） */
export const UTF8_BOM = "﻿";

/** 月の明細の CSV の文字列（BOM・見出し付き、改行は CRLF。最後の行にも CRLF を付ける） */
export function monthCsv(records: readonly CsvRecord[]): string {
  const lines = [CSV_HEADER, ...monthCsvRows(records)].map((row) => row.map(escapeCsvField).join(","));
  return UTF8_BOM + lines.map((line) => `${line}\r\n`).join("");
}

/** 保存するファイルの名前。month は YYYY-MM */
export function csvFileName(month: string): string {
  return `routepense-${month}.csv`;
}
