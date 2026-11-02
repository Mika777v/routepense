import type { DailyRecord } from "@routepense/shared";
import { useEffect, useState } from "react";
import { listDailyRecords } from "./daily-records-api";
import { MonthCalendar } from "./MonthCalendar";
import { buildCalendar, countUnentered, currentMonth, monthLabel, shiftMonth, type MonthString } from "./month";

/** 記録の読み込みの状態。どの月の結果かも持ち、月を切り替えた直後に前の月の記録を出さないようにする */
type LoadState =
  | { kind: "loading"; month: MonthString }
  | { kind: "ok"; month: MonthString; records: DailyRecord[] }
  | { kind: "error"; month: MonthString; message: string };

/** 月次画面（カレンダー）。表示する月を切り替え、その月の記録をカレンダーに並べる */
export function CalendarPage() {
  const [month, setMonth] = useState<MonthString>(() => currentMonth());
  const [load, setLoad] = useState<LoadState>({ kind: "loading", month });

  useEffect(() => {
    // 月が変わるたびに読み直す。読み終わる前に月を切り替えたら、古い月の結果は捨てる
    let active = true;
    listDailyRecords(month).then((result) => {
      if (!active) return;
      setLoad(
        result.ok
          ? { kind: "ok", month, records: result.value }
          : { kind: "error", month, message: result.error.error },
      );
    });
    return () => {
      active = false;
    };
  }, [month]);

  // 読み込み中（または前の月の結果しか無いとき）は、記録の無いカレンダーを出さずに待つ
  const current = load.month === month ? load : { kind: "loading" as const, month };
  const weeks = current.kind === "ok" ? buildCalendar(month, current.records) : null;
  const unentered = weeks ? countUnentered(weeks) : null;

  return (
    <section className="calendar-page" aria-labelledby="calendar-heading">
      <div className="calendar-toolbar">
        <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="前の月">
          ‹ 前の月
        </button>
        <h2 id="calendar-heading" aria-live="polite">
          {monthLabel(month)}
        </h2>
        <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="次の月">
          次の月 ›
        </button>
        <button type="button" className="calendar-today" onClick={() => setMonth(currentMonth())}>
          今月
        </button>
      </div>

      {current.kind === "loading" && <p className="muted">読み込んでいます…</p>}
      {current.kind === "error" && (
        <p className="form-alert" role="alert">
          {current.message}
        </p>
      )}
      {weeks && (
        <>
          <p className="calendar-summary">
            {unentered === 0 ? "すべての日に入力があります" : `未入力の日: ${unentered}日`}
          </p>
          <div className="calendar-scroll">
            <MonthCalendar weeks={weeks} caption={monthLabel(month)} />
          </div>
        </>
      )}
    </section>
  );
}
