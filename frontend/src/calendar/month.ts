import {
  assertNever,
  dailyFare,
  weekdayOf,
  type DailyRecord,
  type DateString,
  type Weekday,
  type WorkStyle,
} from "@routepense/shared";

/** 月を表す文字列（YYYY-MM）。日付（YYYY-MM-DD）と同じく、タイムゾーンのずれを避けるため文字列で持つ */
export type MonthString = string;

/**
 * カレンダーの1日の状態（判別可能なユニオン型）。
 * 「未入力」は勤務区分（WorkStyle）に含めない決まりなので、記録が無いことを別の形で表す。
 * こうすると、休日（記録があって kind が "holiday"）と未入力（記録が無い）を取り違えない。
 */
export type DayStatus =
  | { kind: "unentered" }
  | { kind: "recorded"; record: DailyRecord; fare: number };

/** カレンダーのマス1つ分 */
export type CalendarDay = {
  date: DateString;
  /** 日（1〜31） */
  day: number;
  weekday: Weekday;
  status: DayStatus;
  /** 一括設定で当てはめた、まだ保存していない日か */
  isDraft: boolean;
};

/** カレンダーの1週（月曜〜日曜の7マス）。前後の月の日は null（空のマス） */
export type CalendarWeek = (CalendarDay | null)[];

/**
 * 週の並び。月曜から始め、土日を右端にまとめる。
 * 平日の出勤と土日の休日が、それぞれ縦にそろって見えるようにするため。
 */
export const WEEK_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "日",
  1: "月",
  2: "火",
  3: "水",
  4: "木",
  5: "金",
  6: "土",
};

function parseMonth(month: MonthString): { year: number; month: number } {
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * 今日の月を返す。「今日」は使う人の手元の日付なので、ここだけはローカルの時刻を読む。
 * テストで日付を決められるよう、今の時刻を引数で受け取れるようにしておく。
 */
export function currentMonth(now: Date = new Date()): MonthString {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

/** delta か月ずらした月を返す（例: 2026-12 に +1 → 2027-01） */
export function shiftMonth(month: MonthString, delta: number): MonthString {
  const { year, month: m } = parseMonth(month);
  // 月に 13 や 0 を渡しても、Date.UTC が年をまたいで繰り上げ・繰り下げしてくれる
  const shifted = new Date(Date.UTC(year, m - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

/** その月の日数（28〜31） */
export function daysInMonth(month: MonthString): number {
  const { year, month: m } = parseMonth(month);
  // 「翌月の0日」は、その月の末日になる
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

/** 表示用の月の名前（例: 2026年11月） */
export function monthLabel(month: MonthString): string {
  const { year, month: m } = parseMonth(month);
  return `${year}年${m}月`;
}

/**
 * 月のカレンダーを、週ごとの配列にして返す（純粋関数）。
 * records はその月の日次記録。記録の無い日は「未入力」になる。
 * draftDates は、一括設定で当てはめて、まだ保存していない日。
 */
export function buildCalendar(
  month: MonthString,
  records: readonly DailyRecord[],
  draftDates: ReadonlySet<DateString> = new Set(),
): CalendarWeek[] {
  // 日付から記録をすぐ引けるよう、Map（キーと値の組の入れ物）にしておく
  const byDate = new Map(records.map((record) => [record.date, record]));

  const days: CalendarDay[] = [];
  for (let day = 1; day <= daysInMonth(month); day++) {
    const date = `${month}-${pad2(day)}`;
    const record = byDate.get(date);
    days.push({
      date,
      day,
      weekday: weekdayOf(date),
      status: record ? { kind: "recorded", record, fare: dailyFare(record) } : { kind: "unentered" },
      isDraft: draftDates.has(date),
    });
  }

  const weeks: CalendarWeek[] = [];
  // 1日の前に、月曜から数えて何マス空けるか
  const first = days[0];
  let week: CalendarWeek = first ? Array(WEEK_ORDER.indexOf(first.weekday)).fill(null) : [];
  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    // 最後の週の残りを空のマスで埋め、どの週も7マスにそろえる
    weeks.push([...week, ...Array<null>(7 - week.length).fill(null)]);
  }
  return weeks;
}

/** 未入力の日の数 */
export function countUnentered(weeks: readonly CalendarWeek[]): number {
  return weeks.flat().filter((day) => day?.status.kind === "unentered").length;
}

/** 勤務区分の表示名。出勤はルート名も添える */
export function workStyleLabel(workStyle: WorkStyle): string {
  switch (workStyle.kind) {
    case "remote":
      return "在宅";
    case "commute":
      return `出勤（${workStyle.route.name}）`;
    case "holiday":
      return "休日";
    default:
      return assertNever(workStyle);
  }
}
