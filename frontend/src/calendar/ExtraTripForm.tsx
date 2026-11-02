import { TRANSPORTS, type DateString, type ExtraTrip, type Route } from "@routepense/shared";
import { useState, type FormEvent } from "react";
import { TRANSPORT_LABELS, formatYen } from "../routes/route-form";
import { addExtraTrip, updateExtraTrip } from "./extra-trips-api";
import {
  TRIP_TYPE_LABELS,
  emptyExtraTripForm,
  fillFromRoute,
  previewFare,
  toExtraTripFormErrors,
  toExtraTripFormValues,
  toExtraTripInput,
  type ExtraTripFormErrors,
  type ExtraTripFormField,
  type ExtraTripFormValues,
} from "./extra-trip-form";

type Props = {
  date: DateString;
  routes: Route[];
  /** 直す移動（新しく足すときは null） */
  editing: ExtraTrip | null;
  onSaved: (trip: ExtraTrip) => void;
  onCancel: () => void;
};

/**
 * 追加の移動を足す・直すフォーム。手で入力するか、登録済みのルートから選んで値をコピーする。
 * 入力の判定は API に任せ、返ってきた理由を欄ごとに出す。
 */
export function ExtraTripForm({ date, routes, editing, onSaved, onCancel }: Props) {
  const [values, setValues] = useState<ExtraTripFormValues>(() =>
    editing ? toExtraTripFormValues(editing) : emptyExtraTripForm,
  );
  const [errors, setErrors] = useState<ExtraTripFormErrors>({});
  const [otherErrors, setOtherErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function setField<K extends keyof ExtraTripFormValues>(key: K, value: ExtraTripFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function pickRoute(routeId: string) {
    const route = routes.find((r) => r.id === routeId);
    // 「手で入力する」に戻したときは、入力済みの値は残し、元のルートだけを外す
    setValues((prev) => (route ? fillFromRoute(prev, route) : { ...prev, sourceRouteId: "" }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const input = toExtraTripInput(values);
    const result = editing ? await updateExtraTrip(date, editing.id, input) : await addExtraTrip(date, input);
    setSubmitting(false);
    if (result.ok) {
      onSaved(result.value);
      return;
    }
    const { byField, other } = toExtraTripFormErrors(result.error.fieldErrors);
    setErrors(byField);
    setOtherErrors(result.error.fieldErrors?.length ? other : [result.error.error]);
  }

  function errorProps(field: ExtraTripFormField) {
    return errors[field]
      ? { "aria-invalid": true as const, "aria-describedby": `trip-${field}-error` }
      : {};
  }

  function fieldError(field: ExtraTripFormField) {
    return (
      errors[field] && (
        <p id={`trip-${field}-error`} className="field-error">
          {errors[field]}
        </p>
      )
    );
  }

  const amount = previewFare(values);

  return (
    <form className="trip-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
      <p className="trip-form-title">{editing ? "追加の移動を直す" : "追加の移動を足す"}</p>

      {routes.length > 0 && (
        <div className="field">
          <label htmlFor="trip-route">登録済みのルートから選ぶ</label>
          <select id="trip-route" value={values.sourceRouteId} onChange={(e) => pickRoute(e.target.value)}>
            <option value="">手で入力する</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="trip-from">出発地</label>
        <input
          id="trip-from"
          value={values.from}
          onChange={(e) => setField("from", e.target.value)}
          {...errorProps("from")}
        />
        {fieldError("from")}
      </div>
      <div className="field">
        <label htmlFor="trip-to">到着地</label>
        <input id="trip-to" value={values.to} onChange={(e) => setField("to", e.target.value)} {...errorProps("to")} />
        {fieldError("to")}
      </div>

      <fieldset className="field">
        <legend>交通手段</legend>
        <div className="segmented">
          {TRANSPORTS.map((t) => (
            <label key={t}>
              <input
                type="radio"
                name="trip-transport"
                checked={values.transport === t}
                onChange={() => setField("transport", t)}
              />
              <span>{TRANSPORT_LABELS[t]}</span>
            </label>
          ))}
        </div>
        {fieldError("transport")}
      </fieldset>

      <div className="field">
        <label htmlFor="trip-fare">片道運賃（円）</label>
        <input
          id="trip-fare"
          inputMode="numeric"
          className="fare-input"
          value={values.oneWayFare}
          onChange={(e) => setField("oneWayFare", e.target.value)}
          {...errorProps("oneWayFare")}
        />
        {fieldError("oneWayFare")}
      </div>

      <fieldset className="field">
        <legend>片道 / 往復</legend>
        <div className="segmented">
          {(["oneWay", "roundTrip"] as const).map((type) => (
            <label key={type}>
              <input
                type="radio"
                name="trip-type"
                checked={values.tripType === type}
                onChange={() => setField("tripType", type)}
              />
              <span>{TRIP_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
        {fieldError("tripType")}
      </fieldset>

      <div className="field">
        <label htmlFor="trip-purpose">目的・メモ（任意）</label>
        <input
          id="trip-purpose"
          value={values.purpose}
          placeholder="客先B打合せ"
          onChange={(e) => setField("purpose", e.target.value)}
          {...errorProps("purpose")}
        />
        {fieldError("purpose")}
      </div>

      <p className="trip-amount">
        金額: {amount === null ? "—" : formatYen(amount)}
        {amount !== null && values.tripType === "roundTrip" && (
          <span className="muted">（片道 {formatYen(amount / 2)} × 2）</span>
        )}
      </p>

      {otherErrors.length > 0 && (
        <div className="form-alert" role="alert">
          {otherErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? "保存しています…" : editing ? "変更を保存" : "足す"}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          やめる
        </button>
      </div>
    </form>
  );
}
