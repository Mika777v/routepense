import { formatYen } from "../routes/route-form";
import { WEEK_ORDER, WEEKDAY_LABELS, workStyleLabel, type CalendarDay, type CalendarWeek } from "./month";

type Props = {
  weeks: CalendarWeek[];
  /** 表の見出し（読み上げ用）。例: 2026年11月 */
  caption: string;
};

/** 1マス分の中身。記録の有無で表示を分ける */
function DayCell({ day }: { day: CalendarDay }) {
  const { status } = day;
  if (status.kind === "unentered") {
    return (
      <td className="cal-day is-unentered">
        <span className="cal-date">{day.day}</span>
        <span className="cal-kind">未入力</span>
      </td>
    );
  }
  const { workStyle, extraTrips } = status.record;
  return (
    <td className={`cal-day is-${workStyle.kind}`}>
      <span className="cal-date">{day.day}</span>
      <span className="cal-kind">{workStyleLabel(workStyle)}</span>
      <span className="cal-fare">
        {status.fare > 0 ? formatYen(status.fare) : ""}
        {extraTrips.length > 0 && <span className="cal-extra">追加 {extraTrips.length}件</span>}
      </span>
    </td>
  );
}

/**
 * 月のカレンダー（表示だけ）。週ごとの配列を、そのまま表の行に並べる。
 * 日をクリックして直す動きは、次の作業（日の編集パネル）で足す。
 */
export function MonthCalendar({ weeks, caption }: Props) {
  return (
    <table className="calendar">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {WEEK_ORDER.map((weekday) => (
            <th key={weekday} scope="col" className={weekday === 0 || weekday === 6 ? "is-weekend" : undefined}>
              {WEEKDAY_LABELS[weekday]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          // 週の最初の日付は月の中で1つだけなので、行の key に使える（空のマスだけの週は無い）
          <tr key={week.find((day) => day !== null)?.date}>
            {week.map((day, i) =>
              day ? <DayCell key={day.date} day={day} /> : <td key={`empty-${i}`} className="cal-empty" />,
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
