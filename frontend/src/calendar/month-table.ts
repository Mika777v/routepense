import { extraTripFare, workStyleFare, type DateString, type Transport, type TripType } from "@routepense/shared";
import { WEEKDAY_LABELS, workStyleLabel, type CalendarDay, type CalendarWeek } from "./month";

/** 表の1行の中の、追加の移動1件の内訳 */
export type TripDetail = {
  id: string;
  /** 区間（例: 中野 → 品川） */
  section: string;
  transport: Transport;
  tripType: TripType;
  fare: number;
  purpose?: string;
};

/**
 * 表の1行（1日分）。カレンダーのマス（CalendarDay）から作る。
 * 未入力の日は、金額の列を null にして「まだ分からない」ことを 0 円と区別する。
 */
export type TableRow = {
  date: DateString;
  /** 表示用の日付（例: 11/2（月）） */
  dateLabel: string;
  /** 土日か（行の色分けに使う） */
  isWeekend: boolean;
  /** 祝日なら祝日名。勤務区分は変えず、日付の横に添えるだけ */
  holidayName?: string;
  /** 勤務区分の表示名（在宅 / 出勤（ルート名） / 休日 / 未入力） */
  kindLabel: string;
  /** 勤務区分による通常の交通費。未入力は null */
  workStyleFare: number | null;
  trips: TripDetail[];
  /** その日の交通費（通常＋追加の移動）。未入力は null */
  fare: number | null;
  isUnentered: boolean;
  isDraft: boolean;
};

/** 表示用の日付（例: 2026-11-02 → 11/2（月）） */
export function dateLabel(day: Pick<CalendarDay, "date" | "day" | "weekday">): string {
  return `${Number(day.date.slice(5, 7))}/${day.day}（${WEEKDAY_LABELS[day.weekday]}）`;
}

/** カレンダーのマス1つを、表の1行にする */
export function toTableRow(day: CalendarDay): TableRow {
  const base = {
    date: day.date,
    dateLabel: dateLabel(day),
    isWeekend: day.weekday === 0 || day.weekday === 6,
    ...(day.holidayName !== undefined && { holidayName: day.holidayName }),
    isDraft: day.isDraft,
  };
  const { status } = day;
  if (status.kind === "unentered") {
    return {
      ...base,
      kindLabel: "未入力",
      workStyleFare: null,
      trips: [],
      fare: null,
      isUnentered: true,
    };
  }
  const { workStyle, extraTrips } = status.record;
  return {
    ...base,
    kindLabel: workStyleLabel(workStyle),
    workStyleFare: workStyleFare(workStyle),
    trips: extraTrips.map((trip) => ({
      id: trip.id,
      section: `${trip.from} → ${trip.to}`,
      transport: trip.transport,
      tripType: trip.tripType,
      fare: extraTripFare(trip),
      ...(trip.purpose && { purpose: trip.purpose }),
    })),
    fare: status.fare,
    isUnentered: false,
  };
}

/**
 * 週ごとの配列（カレンダーと同じもの）から、表の行を日付の順に作る（純粋関数）。
 * カレンダーと同じ buildCalendar の結果から作るので、表示を切り替えても同じ記録・同じ金額が出る。
 */
export function buildTableRows(weeks: readonly CalendarWeek[]): TableRow[] {
  // flat で週の配列を1列にし、前後の月の空のマス（null）を除く。
  // `day !== null` から、TypeScript が「残りは CalendarDay」と推論する（型の述語の推論。第13章）
  return weeks
    .flat()
    .filter((day) => day !== null)
    .map(toTableRow);
}
