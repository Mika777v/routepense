import type { DailyRecord, DateString } from "@routepense/shared";
import { useEffect, useState } from "react";
import { listRoutes } from "../routes/routes-api";
import { listDailyRecords } from "./daily-records-api";
import { removeRecord, upsertRecord } from "./day-edit";
import { DayPanel, type RoutesState } from "./DayPanel";
import { MonthCalendar } from "./MonthCalendar";
import { buildCalendar, countUnentered, currentMonth, monthLabel, shiftMonth, type MonthString } from "./month";

/** 記録の読み込みの状態。どの月の結果かも持ち、月を切り替えた直後に前の月の記録を出さないようにする */
type LoadState =
  | { kind: "loading"; month: MonthString }
  | { kind: "ok"; month: MonthString; records: DailyRecord[] }
  | { kind: "error"; month: MonthString; message: string };

/**
 * 月次画面（カレンダー）。表示する月を切り替え、その月の記録をカレンダーに並べる。
 * 記録の一覧はこの部品が持ち、カレンダー（表示）と日の編集パネル（保存）の両方に渡す。
 * 共通の親に state を置く（state の持ち上げ）と、パネルで保存した結果がすぐカレンダーに出る。
 */
export function CalendarPage() {
  const [month, setMonth] = useState<MonthString>(() => currentMonth());
  const [load, setLoad] = useState<LoadState>({ kind: "loading", month });
  const [routes, setRoutes] = useState<RoutesState>({ kind: "loading" });
  const [selectedDate, setSelectedDate] = useState<DateString | null>(null);

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

  useEffect(() => {
    // 出勤で選ぶルートの一覧。画面を開いたときに1回だけ読む
    let active = true;
    listRoutes().then((result) => {
      if (!active) return;
      setRoutes(result.ok ? { kind: "ok", routes: result.value } : { kind: "error", message: result.error.error });
    });
    return () => {
      active = false;
    };
  }, []);

  function changeMonth(next: MonthString) {
    setMonth(next);
    // 別の月に移ったら、編集中の日は閉じる
    setSelectedDate(null);
  }

  /** 表示中の月の記録の一覧を、関数で書き換える（保存・未入力に戻したとき） */
  function updateRecords(update: (records: DailyRecord[]) => DailyRecord[]) {
    setLoad((prev) => (prev.kind === "ok" ? { ...prev, records: update(prev.records) } : prev));
  }

  // 読み込み中（または前の月の結果しか無いとき）は、記録の無いカレンダーを出さずに待つ
  const current = load.month === month ? load : { kind: "loading" as const, month };
  const weeks = current.kind === "ok" ? buildCalendar(month, current.records) : null;
  const unentered = weeks ? countUnentered(weeks) : null;
  const selectedRecord =
    current.kind === "ok" && selectedDate ? current.records.find((r) => r.date === selectedDate) : undefined;

  return (
    <section className="calendar-page" aria-labelledby="calendar-heading">
      <div className="calendar-toolbar">
        <button type="button" onClick={() => changeMonth(shiftMonth(month, -1))} aria-label="前の月">
          ‹ 前の月
        </button>
        <h2 id="calendar-heading" aria-live="polite">
          {monthLabel(month)}
        </h2>
        <button type="button" onClick={() => changeMonth(shiftMonth(month, 1))} aria-label="次の月">
          次の月 ›
        </button>
        <button type="button" className="calendar-today" onClick={() => changeMonth(currentMonth())}>
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
            <span className="calendar-hint">日を押すと、勤務区分を選べます</span>
          </p>
          <div className={selectedDate ? "calendar-body has-panel" : "calendar-body"}>
            <div className="calendar-scroll">
              <MonthCalendar
                weeks={weeks}
                caption={monthLabel(month)}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />
            </div>
            {selectedDate && (
              // key を日付にすると、別の日を開いたときにパネルの state（エラーの文など）が作り直される
              <DayPanel
                key={selectedDate}
                date={selectedDate}
                record={selectedRecord}
                routes={routes}
                onSaved={(record) => updateRecords((records) => upsertRecord(records, record))}
                onCleared={(date) => updateRecords((records) => removeRecord(records, date))}
                onClose={() => setSelectedDate(null)}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}
