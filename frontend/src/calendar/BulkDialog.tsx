import type { BulkApplyResult, Route } from "@routepense/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  WEEKDAY_PRESETS,
  holidaysInRange,
  initialBulkForm,
  toBulkFormErrors,
  toBulkPreviewRequest,
  toggleWeekday,
  type BulkFormErrors,
  type BulkFormValues,
} from "./bulk-form";
import { previewBulk } from "./daily-records-api";
import { WEEK_ORDER, WEEKDAY_LABELS, daysInMonth, monthLabel, type MonthString } from "./month";

type Props = {
  month: MonthString;
  routes: Route[];
  /** 下見の結果。カレンダーへ当てはめる（まだ保存しない） */
  onApply: (result: BulkApplyResult) => void;
  onClose: () => void;
};

const KIND_LABELS: Record<BulkFormValues["kind"], string> = { remote: "在宅", commute: "出勤", holiday: "休日" };

/**
 * 一括設定ダイアログ。期間（表示中の月の中）・曜日・勤務区分を入れて、カレンダーへ当てはめる。
 * 入力が正しいかは下見の API が判定し、返ってきた理由を欄ごとに出す（画面では判定しない決まり）。
 */
export function BulkDialog({ month, routes, onApply, onClose }: Props) {
  const [values, setValues] = useState<BulkFormValues>(() => initialBulkForm(month, routes));
  const [errors, setErrors] = useState<BulkFormErrors>({});
  const [otherErrors, setOtherErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // <dialog> の showModal で開くと、後ろの画面は操作できなくなり、Esc で閉じられる
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const holidays = holidaysInRange(values.startDate, values.endDate);
  const firstDay = `${month}-01`;
  const lastDay = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;

  function update<K extends keyof BulkFormValues>(key: K, value: BulkFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const result = await previewBulk(toBulkPreviewRequest(values));
    setSubmitting(false);
    if (result.ok) {
      onApply(result.value);
      return;
    }
    const { byField, other } = toBulkFormErrors(result.error.fieldErrors);
    setErrors(byField);
    setOtherErrors(result.error.fieldErrors?.length ? other : [result.error.error]);
  }

  return (
    // onClose は Esc で閉じたときにも呼ばれる
    <dialog ref={dialogRef} className="bulk-dialog" aria-labelledby="bulk-heading" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <h3 id="bulk-heading">一括設定（{monthLabel(month)}）</h3>
        <p className="muted bulk-note">条件に合う日へ、同じ勤務区分を当てはめます。まだ保存はしません。</p>

        <div className="field-pair">
          <div className="field">
            <label htmlFor="bulk-start">開始日</label>
            <input
              id="bulk-start"
              type="date"
              min={firstDay}
              max={lastDay}
              value={values.startDate}
              aria-invalid={errors.startDate ? true : undefined}
              aria-describedby={errors.startDate ? "bulk-start-error" : undefined}
              onChange={(e) => update("startDate", e.target.value)}
            />
            {errors.startDate && (
              <p id="bulk-start-error" className="field-error">
                {errors.startDate}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="bulk-end">終了日</label>
            <input
              id="bulk-end"
              type="date"
              min={firstDay}
              max={lastDay}
              value={values.endDate}
              aria-invalid={errors.endDate ? true : undefined}
              aria-describedby={errors.endDate ? "bulk-end-error" : undefined}
              onChange={(e) => update("endDate", e.target.value)}
            />
            {errors.endDate && (
              <p id="bulk-end-error" className="field-error">
                {errors.endDate}
              </p>
            )}
          </div>
        </div>

        <fieldset className="field">
          <legend>曜日</legend>
          <div className="bulk-presets">
            {Object.entries(WEEKDAY_PRESETS).map(([label, weekdays]) => (
              <button key={label} type="button" onClick={() => update("weekdays", [...weekdays])}>
                {label}
              </button>
            ))}
            <button type="button" onClick={() => update("weekdays", [])}>
              外す
            </button>
          </div>
          <div className="bulk-weekdays">
            {WEEK_ORDER.map((weekday) => (
              <label key={weekday}>
                <input
                  type="checkbox"
                  checked={values.weekdays.includes(weekday)}
                  onChange={() => update("weekdays", toggleWeekday(values.weekdays, weekday))}
                />
                <span>{WEEKDAY_LABELS[weekday]}</span>
              </label>
            ))}
          </div>
          {errors.weekdays && <p className="field-error">{errors.weekdays}</p>}
          <label className="bulk-holiday">
            <input
              type="checkbox"
              checked={values.skipHolidays}
              aria-describedby="bulk-holiday-list"
              onChange={(e) => update("skipHolidays", e.target.checked)}
            />
            祝日を除く
          </label>
          <p id="bulk-holiday-list" className="muted bulk-note">
            {holidays.length > 0 ? `期間の祝日: ${holidays.join("・")}` : "期間に祝日はありません"}
          </p>
        </fieldset>

        <fieldset className="field">
          <legend>勤務区分</legend>
          <div className="segmented">
            {(["remote", "commute", "holiday"] as const).map((kind) => (
              <label key={kind}>
                <input
                  type="radio"
                  name="bulk-kind"
                  value={kind}
                  checked={values.kind === kind}
                  disabled={kind === "commute" && routes.length === 0}
                  onChange={() => update("kind", kind)}
                />
                <span>{KIND_LABELS[kind]}</span>
              </label>
            ))}
          </div>
          {values.kind === "commute" && (
            <select
              className="bulk-route"
              aria-label="ルート"
              value={values.routeId}
              onChange={(e) => update("routeId", e.target.value)}
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          )}
          {routes.length === 0 && <p className="muted bulk-note">ルートが無いので、出勤は選べません。</p>}
          {errors.workStyle && <p className="field-error">{errors.workStyle}</p>}
        </fieldset>

        {otherErrors.length > 0 && (
          <div className="form-alert" role="alert">
            {otherErrors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "当てはめています…" : "カレンダーへ当てはめる"}
          </button>
          <button type="button" onClick={() => dialogRef.current?.close()}>
            やめる
          </button>
        </div>
      </form>
    </dialog>
  );
}
