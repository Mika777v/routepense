import type { DateString } from "@routepense/shared";
import { formatYen } from "../routes/route-form";
import { WEEK_ORDER, WEEKDAY_LABELS, workStyleLabel, type CalendarDay, type CalendarWeek } from "./month";

type Props = {
  weeks: CalendarWeek[];
  /** 表の見出し（読み上げ用）。例: 2026年11月 */
  caption: string;
  /** 編集中の日（無ければ null） */
  selectedDate: DateString | null;
  onSelect: (date: DateString) => void;
};

/** 祝日名。祝日でない日は何も出さない */
function HolidayName({ day }: { day: CalendarDay }) {
  return day.holidayName !== undefined ? <span className="cal-holiday">{day.holidayName}</span> : null;
}

/** 1マス分の中身。記録の有無で表示を分ける */
function DayContent({ day }: { day: CalendarDay }) {
  const { status } = day;
  if (status.kind === "unentered") {
    return (
      <>
        <span className="cal-date">
          {day.day}
          <HolidayName day={day} />
        </span>
        <span className="cal-kind">未入力</span>
      </>
    );
  }
  const { workStyle, extraTrips } = status.record;
  return (
    <>
      <span className="cal-date">
        {day.day}
        <HolidayName day={day} />
        {day.isDraft && <span className="cal-draft-mark">未保存</span>}
      </span>
      <span className="cal-kind">{workStyleLabel(workStyle)}</span>
      <span className="cal-fare">
        {status.fare > 0 ? formatYen(status.fare) : ""}
        {extraTrips.length > 0 && <span className="cal-extra">追加 {extraTrips.length}件</span>}
      </span>
    </>
  );
}

/** マスの見た目の種類（CSS のクラス名に使う）: 在宅・出勤・休日・未入力 */
function cellKind(day: CalendarDay): string {
  return day.status.kind === "unentered" ? "unentered" : day.status.record.workStyle.kind;
}

/**
 * 月のカレンダー。週ごとの配列を、そのまま表の行に並べる。
 * マスはボタンになっていて、押すと onSelect でその日を親に知らせる（編集パネルは親が出す）。
 */
export function MonthCalendar({ weeks, caption, selectedDate, onSelect }: Props) {
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
              day ? (
                <td key={day.date} className={`cal-day is-${cellKind(day)}${day.isDraft ? " is-draft" : ""}`}>
                  <button
                    type="button"
                    className="cal-button"
                    aria-pressed={day.date === selectedDate}
                    onClick={() => onSelect(day.date)}
                  >
                    <DayContent day={day} />
                  </button>
                </td>
              ) : (
                <td key={`empty-${i}`} className="cal-empty" />
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
