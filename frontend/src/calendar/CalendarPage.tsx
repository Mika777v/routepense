import {
  monthlyFare,
  type BulkApplyResult,
  type DailyRecord,
  type DateString,
} from "@routepense/shared";
import { useEffect, useState } from "react";
import { listRoutes } from "../routes/routes-api";
import { listDailyRecords, saveBulk } from "./daily-records-api";
import { BulkDialog } from "./BulkDialog";
import { errorMessage, removeRecord, upsertRecord } from "./day-edit";
import { DayPanel, type RoutesState } from "./DayPanel";
import {
  mergeDraft,
  overlayDraft,
  setDraftDay,
  summarizeDraft,
  toDraftWorkStyle,
  type Draft,
  type DraftSummary,
} from "./draft";
import { DraftBar } from "./DraftBar";
import { MonthCalendar } from "./MonthCalendar";
import { MonthTotal } from "./MonthTotal";
import {
  buildCalendar,
  countUnentered,
  currentMonth,
  monthLabel,
  shiftMonth,
  type MonthString,
} from "./month";

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
  // 一括設定: ダイアログを開いているか、当てはめ中の内容、登録の前の確認、登録中か、その結果
  const [bulkOpen, setBulkOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => new Map());
  const [confirming, setConfirming] = useState<DraftSummary | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      setRoutes(
        result.ok
          ? { kind: "ok", routes: result.value }
          : { kind: "error", message: result.error.error },
      );
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
    setLoad((prev) =>
      prev.kind === "ok" ? { ...prev, records: update(prev.records) } : prev,
    );
  }

  function applyBulk(result: BulkApplyResult) {
    setBulkOpen(false);
    setDraft((prev) => mergeDraft(prev, result.records));
    setConfirming(null);
    setDraftError(null);
    setNotice(
      `${result.records.length}日に当てはめました。まだ保存していません`,
    );
  }

  function discardDraft() {
    setDraft(new Map());
    setConfirming(null);
    setDraftError(null);
    setNotice("当てはめを取り消しました");
  }

  async function saveDraft(summary: DraftSummary) {
    setSavingDraft(true);
    setDraftError(null);
    const result = await saveBulk(summary.request);
    setSavingDraft(false);
    if (!result.ok) {
      setDraftError(errorMessage(result.error));
      return;
    }
    updateRecords((records) => result.value.reduce(upsertRecord, records));
    setDraft(new Map());
    setConfirming(null);
    setNotice(`${result.value.length}日分を登録しました`);
  }

  // 読み込み中（または前の月の結果しか無いとき）は、記録の無いカレンダーを出さずに待つ
  const current =
    load.month === month ? load : { kind: "loading" as const, month };
  const saved = current.kind === "ok" ? current.records : [];
  const hasDraft = draft.size > 0;
  // カレンダーと合計は、同じ記録の一覧（保存済み＋当てはめ中）から作り、金額が食い違わないようにする
  const shown = overlayDraft(saved, draft);
  const weeks =
    current.kind === "ok"
      ? buildCalendar(month, shown, new Set(draft.keys()))
      : null;
  const unentered = weeks ? countUnentered(weeks) : null;
  const selectedRecord = selectedDate
    ? saved.find((r) => r.date === selectedDate)
    : undefined;

  function handleSave() {
    const summary = summarizeDraft(draft, saved);
    // 上書きする日があれば、先に確かめる。無ければそのまま登録する
    if (summary.overwrittenDates.length > 0) setConfirming(summary);
    else void saveDraft(summary);
  }

  return (
    <section className="calendar-page" aria-labelledby="calendar-heading">
      <div className="calendar-toolbar">
        <button
          type="button"
          disabled={hasDraft}
          onClick={() => changeMonth(shiftMonth(month, -1))}
          aria-label="前の月"
        >
          ‹ 前の月
        </button>
        <h2 id="calendar-heading" aria-live="polite">
          {monthLabel(month)}
        </h2>
        <button
          type="button"
          disabled={hasDraft}
          onClick={() => changeMonth(shiftMonth(month, 1))}
          aria-label="次の月"
        >
          次の月 ›
        </button>
        <button
          type="button"
          className="calendar-today"
          disabled={hasDraft}
          onClick={() => changeMonth(currentMonth())}
        >
          今月
        </button>
        <button
          type="button"
          className="primary"
          disabled={current.kind !== "ok" || routes.kind !== "ok"}
          onClick={() => {
            setNotice(null);
            setBulkOpen(true);
          }}
        >
          一括設定
        </button>
      </div>
      <p className="notice" role="status">
        {notice}
      </p>

      {current.kind === "loading" && <p className="muted">読み込んでいます…</p>}
      {current.kind === "error" && (
        <p className="form-alert" role="alert">
          {current.message}
        </p>
      )}
      {weeks && (
        <>
          <MonthTotal
            fare={monthlyFare(shown)}
            unentered={unentered ?? 0}
            hasDraft={hasDraft}
          />
          <p className="calendar-summary">日を押すと、勤務区分を選べます</p>
          {hasDraft && (
            <DraftBar
              count={draft.size}
              confirming={confirming}
              saving={savingDraft}
              error={draftError}
              onSave={handleSave}
              onConfirm={() => confirming && void saveDraft(confirming)}
              onBack={() => setConfirming(null)}
              onDiscard={discardDraft}
            />
          )}
          <div
            className={
              selectedDate ? "calendar-body has-panel" : "calendar-body"
            }
          >
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
                onSaved={(record) =>
                  updateRecords((records) => upsertRecord(records, record))
                }
                onCleared={(date) =>
                  updateRecords((records) => removeRecord(records, date))
                }
                onClose={() => setSelectedDate(null)}
                draft={
                  hasDraft
                    ? {
                        workStyle: draft.get(selectedDate),
                        onChange: (choice) => {
                          const workStyle =
                            choice && routes.kind === "ok"
                              ? toDraftWorkStyle(choice, routes.routes)
                              : undefined;
                          setDraft((prev) =>
                            setDraftDay(prev, selectedDate, workStyle ?? null),
                          );
                          // 直したら、確認の内容は作り直す
                          setConfirming(null);
                        },
                      }
                    : undefined
                }
              />
            )}
          </div>
        </>
      )}
      {bulkOpen && routes.kind === "ok" && (
        <BulkDialog
          month={month}
          routes={routes.routes}
          onApply={applyBulk}
          onClose={() => setBulkOpen(false)}
        />
      )}
    </section>
  );
}
