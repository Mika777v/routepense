import {
  extraTripFare,
  type DailyRecord,
  type DateString,
  type Route,
  type WorkStyle,
  type WorkStyleInput,
} from "@routepense/shared";
import { useEffect, useRef, useState } from "react";
import { formatYen } from "../routes/route-form";
import { deleteDailyRecord, saveDailyRecord } from "./daily-records-api";
import { choiceOf, dayLabel, errorMessage, isSameChoice, toWorkStyleInput, type DayChoice } from "./day-edit";

/** ルートの一覧の読み込みの状態（親の CalendarPage が持つ） */
export type RoutesState = { kind: "loading" } | { kind: "ok"; routes: Route[] } | { kind: "error"; message: string };

type Props = {
  date: DateString;
  /** その日の記録。無ければ未入力 */
  record: DailyRecord | undefined;
  routes: RoutesState;
  /** 保存できたとき。親が一覧を新しい記録に置き換える */
  onSaved: (record: DailyRecord) => void;
  /** 未入力に戻せたとき */
  onCleared: (date: DateString) => void;
  onClose: () => void;
  /**
   * 一括設定の当てはめ中だけ渡す。渡されたら、選んだ内容は保存せず、当てはめ中の内容を直す（「登録」でまとめて保存する）。
   * workStyle はその日に当てはめた勤務区分（当てはめていなければ undefined）。onChange(null) で当てはめを外す
   */
  draft?: { workStyle: WorkStyle | undefined; onChange: (choice: WorkStyleInput | null) => void };
};

/** 選べるもの1つ分（ボタンに出す名前と、選んだときの値） */
type Option = { key: string; label: string; choice: DayChoice };

/** 今の記録とルートの一覧から、並べるボタンを作る */
function buildOptions(record: DailyRecord | undefined, routes: Route[]): Option[] {
  const options: Option[] = [{ key: "remote", label: "在宅", choice: { kind: "remote" } }];
  for (const route of routes) {
    options.push({
      key: `commute-${route.id}`,
      label: `出勤（${route.name}）`,
      choice: { kind: "commute", routeId: route.id },
    });
  }
  // 記録のルートが一覧に無い（削除された）ときも、今の選択として見えるようにする。名前は記録のコピーを使う
  const current = record?.workStyle;
  if (current?.kind === "commute" && !routes.some((r) => r.id === current.routeId)) {
    options.push({
      key: `commute-${current.routeId}`,
      label: `出勤（${current.route.name}）`,
      choice: { kind: "commute", routeId: current.routeId },
    });
  }
  options.push({ key: "holiday", label: "休日", choice: { kind: "holiday" } });
  return options;
}

/**
 * 日の編集パネル。勤務区分のボタンを押した時点で保存する（要件定義 F2・U4）。
 * 保存の結果は onSaved・onCleared で親に渡し、カレンダーの表示は親が持つ記録の一覧から作り直す。
 */
export function DayPanel({ date, record, routes, onSaved, onCleared, onClose, draft }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // パネルを開いたら見出しに移り、キーボードや読み上げで続けて操作できるようにする（狭い画面では、パネルまで送られる）
  useEffect(() => {
    headingRef.current?.focus();
  }, [date]);

  // 当てはめ中の日は、当てはめた内容を今の選択として見せる
  const selected = draft?.workStyle ? toWorkStyleInput(draft.workStyle) : choiceOf(record);
  const options = routes.kind === "ok" ? buildOptions(record, routes.routes) : [];

  async function choose(choice: DayChoice) {
    if (saving || isSameChoice(choice, selected)) return;
    if (draft) {
      // 当てはめ中は保存しない。未入力に戻す（記録を消す）ことは、一括設定ではできないので選ばせない
      if (choice.kind !== "unentered") draft.onChange(choice);
      return;
    }
    if (choice.kind === "unentered") {
      const trips = record?.extraTrips.length ?? 0;
      if (trips > 0 && !window.confirm(`この日の追加の移動（${trips}件）も消えます。未入力に戻しますか？`)) {
        return;
      }
    }
    setSaving(true);
    setError(null);
    if (choice.kind === "unentered") {
      const result = await deleteDailyRecord(date);
      if (result.ok) onCleared(date);
      else setError(errorMessage(result.error));
    } else {
      const result = await saveDailyRecord(date, choice);
      if (result.ok) onSaved(result.value);
      else setError(errorMessage(result.error));
    }
    setSaving(false);
  }

  return (
    <section className="day-panel" aria-labelledby="day-panel-heading" aria-busy={saving}>
      <div className="day-panel-head">
        <h3 id="day-panel-heading" ref={headingRef} tabIndex={-1}>
          {dayLabel(date)}
        </h3>
        <button type="button" className="day-panel-close" onClick={onClose} aria-label="パネルを閉じる">
          閉じる
        </button>
      </div>
      <p className="muted day-panel-hint">
        {draft ? "当てはめ中です。選んだ内容は「登録」でまとめて保存します" : "選ぶとすぐ保存します"}
      </p>

      {routes.kind === "loading" && <p className="muted">ルートを読み込んでいます…</p>}
      {routes.kind === "error" && (
        <p className="form-alert" role="alert">
          {routes.message}
        </p>
      )}

      {routes.kind === "ok" && (
        <div className="day-choices" role="group" aria-label="勤務区分">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`day-choice is-${option.choice.kind}`}
              aria-pressed={isSameChoice(option.choice, selected)}
              disabled={saving}
              onClick={() => void choose(option.choice)}
            >
              {option.label}
            </button>
          ))}
          {routes.routes.length === 0 && (
            <p className="muted day-panel-note">ルートが無いので、出勤は選べません。「ルート」の画面で登録してください。</p>
          )}
          {draft ? (
            draft.workStyle && (
              <button type="button" className="day-choice is-unentered" onClick={() => draft.onChange(null)}>
                この日の当てはめを外す
              </button>
            )
          ) : (
            <button
              type="button"
              className="day-choice is-unentered"
              aria-pressed={selected.kind === "unentered"}
              disabled={saving}
              onClick={() => void choose({ kind: "unentered" })}
            >
              未入力に戻す
            </button>
          )}
        </div>
      )}

      <p className="day-panel-status" role="status">
        {saving ? "保存しています…" : ""}
      </p>
      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}

      {record && record.extraTrips.length > 0 && (
        <p className="muted day-panel-note">
          追加の移動: {record.extraTrips.length}件（{formatYen(record.extraTrips.reduce((sum, trip) => sum + extraTripFare(trip), 0))}）
        </p>
      )}
    </section>
  );
}
