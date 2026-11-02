import { TRANSPORTS, type Route, type RouteSearchResponse } from "@routepense/shared";
import { useState, type FormEvent } from "react";
import {
  TRANSPORT_LABELS,
  emptyRouteForm,
  toRouteFormErrors,
  toRouteFormValues,
  toRouteInput,
  type RouteFormErrors,
  type RouteFormField,
  type RouteFormValues,
} from "./route-form";
import { RouteSearchBox } from "./RouteSearchBox";
import { isOpenableUrl } from "./route-search-form";
import { createRoute, updateRoute } from "./routes-api";

type Props = {
  /** 編集するルート。null なら新しく登録する */
  editing: Route | null;
  /** 経路検索が使えるか（API のキーがあるか）。false なら「経路を見る」を出さない */
  routeSearchAvailable: boolean;
  onSaved: (route: Route) => void;
  onCancel: () => void;
};

/**
 * ルートの登録・編集のフォーム。
 * 欄の値はすべて React の state に持つ（制御されたコンポーネント）。
 * 編集するルートが変わったら、親が key を変えてこのコンポーネントを作り直し、state を初期化する。
 */
export function RouteForm({ editing, routeSearchAvailable, onSaved, onCancel }: Props) {
  const [values, setValues] = useState<RouteFormValues>(editing ? toRouteFormValues(editing) : emptyRouteForm);
  const [errors, setErrors] = useState<RouteFormErrors>({});
  const [otherErrors, setOtherErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  /** 登録の後に増やす。経路を調べる欄の key にして、駅の欄と知らせを空に戻す */
  const [savedCount, setSavedCount] = useState(0);

  /** 1つの欄を書き換える。K を欄の名前にすると、値の型も欄に合わせて決まる */
  function setField<K extends RouteFormField>(field: K, value: RouteFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  /** 経路が見つかったら URL の欄に入れる。運賃が分かる実装なら、空の運賃の欄にも入れる（手で入れた値は消さない） */
  function handleRouteFound(response: RouteSearchResponse) {
    setValues((prev) => ({
      ...prev,
      searchUrl: response.url,
      oneWayFare: prev.oneWayFare.trim() === "" && response.fare !== undefined ? String(response.fare) : prev.oneWayFare,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // ブラウザの既定の送信（ページの再読み込み）を止める
    setSubmitting(true);
    const input = toRouteInput(values);
    const result = editing ? await updateRoute(editing.id, input) : await createRoute(input);
    setSubmitting(false);

    if (result.ok) {
      setErrors({});
      setOtherErrors([]);
      setValues(emptyRouteForm);
      setSavedCount((n) => n + 1);
      onSaved(result.value);
      return;
    }
    const { byField, other } = toRouteFormErrors(result.error.fieldErrors);
    setErrors(byField);
    // 欄に結び付かないエラー（通信の失敗など）は、フォームの上にまとめて出す
    setOtherErrors(result.error.fieldErrors ? other : [result.error.error]);
  }

  /** 欄の下に出すエラーの文と、読み上げソフト向けの属性 */
  function errorProps(field: RouteFormField) {
    const message = errors[field];
    return {
      "aria-invalid": message ? true : undefined,
      "aria-describedby": message ? `${field}-error` : undefined,
    };
  }

  function fieldError(field: RouteFormField) {
    const message = errors[field];
    return message ? (
      <p className="field-error" id={`${field}-error`}>
        {message}
      </p>
    ) : null;
  }

  return (
    <form className="route-form" onSubmit={handleSubmit} noValidate>
      <h2>{editing ? "ルートを編集" : "ルートを登録"}</h2>

      {otherErrors.length > 0 && (
        <div className="form-alert" role="alert">
          {otherErrors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      <div className="field">
        <label htmlFor="name">ルート名</label>
        <input
          id="name"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="自宅↔本社"
          {...errorProps("name")}
        />
        {fieldError("name")}
      </div>

      <div className="field-pair">
        <div className="field">
          <label htmlFor="from">出発地</label>
          <input
            id="from"
            value={values.from}
            onChange={(e) => setField("from", e.target.value)}
            placeholder="中野"
            {...errorProps("from")}
          />
          {fieldError("from")}
        </div>
        <div className="field">
          <label htmlFor="to">到着地</label>
          <input
            id="to"
            value={values.to}
            onChange={(e) => setField("to", e.target.value)}
            placeholder="東京"
            {...errorProps("to")}
          />
          {fieldError("to")}
        </div>
      </div>

      <fieldset className="field" aria-describedby={errors.transport ? "transport-error" : undefined}>
        <legend>交通手段</legend>
        <div className="segmented">
          {TRANSPORTS.map((t) => (
            <label key={t}>
              <input
                type="radio"
                name="transport"
                value={t}
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
        <label htmlFor="oneWayFare">片道運賃（円）</label>
        <input
          id="oneWayFare"
          inputMode="numeric"
          value={values.oneWayFare}
          onChange={(e) => setField("oneWayFare", e.target.value)}
          placeholder="220"
          className="fare-input"
          {...errorProps("oneWayFare")}
        />
        {fieldError("oneWayFare")}
      </div>

      {routeSearchAvailable && <RouteSearchBox key={savedCount} route={{ from: values.from, to: values.to }} onFound={handleRouteFound} />}

      <div className="field">
        <label htmlFor="searchUrl">経路の URL（任意）</label>
        <div className="url-row">
          <input
            id="searchUrl"
            type="url"
            value={values.searchUrl}
            onChange={(e) => setField("searchUrl", e.target.value)}
            placeholder="https://…"
            {...errorProps("searchUrl")}
          />
          {isOpenableUrl(values.searchUrl) && (
            <a className="button-link" href={values.searchUrl.trim()} target="_blank" rel="noopener noreferrer">
              開く
            </a>
          )}
        </div>
        {fieldError("searchUrl")}
      </div>

      <div className="form-actions">
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? "保存しています…" : editing ? "変更を保存" : "登録する"}
        </button>
        {editing && (
          <button type="button" onClick={onCancel} disabled={submitting}>
            やめる
          </button>
        )}
      </div>
    </form>
  );
}
