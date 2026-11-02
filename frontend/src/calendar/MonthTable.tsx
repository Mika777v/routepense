import type { DateString, MonthlyFare } from "@routepense/shared";
import { TRANSPORT_LABELS, formatYen } from "../routes/route-form";
import { TRIP_TYPE_LABELS } from "./extra-trip-form";
import type { TableRow } from "./month-table";

type Props = {
  rows: TableRow[];
  /** 表の見出し（読み上げ用）。例: 2026年11月 */
  caption: string;
  /** 表の下の合計の行に出す、月の交通費 */
  fare: MonthlyFare;
  selectedDate: DateString | null;
  onSelect: (date: DateString) => void;
};

/** 金額の列。未入力（null）は「—」にして、0 円と見分ける */
function yenOrDash(amount: number | null): string {
  return amount === null ? "—" : formatYen(amount);
}

/** 1行の「追加の移動」の列。1件ずつ、区間・交通手段・片道/往復・金額・目的を並べる */
function TripList({ row }: { row: TableRow }) {
  if (row.trips.length === 0) return <span className="muted">—</span>;
  return (
    <ul className="table-trips">
      {row.trips.map((trip) => (
        <li key={trip.id}>
          <span className="table-trip-section">{trip.section}</span>
          <span className="table-trip-meta">
            {TRANSPORT_LABELS[trip.transport]}・{TRIP_TYPE_LABELS[trip.tripType]}・{formatYen(trip.fare)}
          </span>
          {trip.purpose && <span className="table-trip-purpose">{trip.purpose}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * 月の表表示。1日を1行にし、追加の移動の内訳まで並べる。
 * 日付はボタンになっていて、押すとカレンダーと同じく日の編集パネルが開く。
 */
export function MonthTable({ rows, caption, fare, selectedDate, onSelect }: Props) {
  return (
    <table className="month-table">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">日付</th>
          <th scope="col">勤務区分</th>
          <th scope="col" className="is-number">
            通常の交通費
          </th>
          <th scope="col">追加の移動</th>
          <th scope="col" className="is-number">
            交通費
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.date}
            className={[
              row.isWeekend && "is-weekend",
              row.isUnentered && "is-unentered",
              row.isDraft && "is-draft",
              row.date === selectedDate && "is-selected",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <th scope="row">
              <button
                type="button"
                className="table-date"
                aria-pressed={row.date === selectedDate}
                onClick={() => onSelect(row.date)}
              >
                {row.dateLabel}
              </button>
              {row.holidayName !== undefined && <span className="cal-holiday">{row.holidayName}</span>}
              {row.isDraft && <span className="cal-draft-mark">未保存</span>}
            </th>
            <td className="table-kind">{row.kindLabel}</td>
            <td className="is-number">{yenOrDash(row.workStyleFare)}</td>
            <td>
              <TripList row={row} />
            </td>
            <td className="is-number table-fare">{yenOrDash(row.fare)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={2}>
            月の合計
          </th>
          <td className="is-number">{formatYen(fare.workStyleTotal)}</td>
          <td className="is-number">{formatYen(fare.extraTotal)}</td>
          <td className="is-number table-fare">{formatYen(fare.total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
