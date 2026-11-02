import { extraTripFare, type DailyRecord, type ExtraTrip, type Route } from "@routepense/shared";
import { useState } from "react";
import { TRANSPORT_LABELS, formatYen } from "../routes/route-form";
import { errorMessage } from "./day-edit";
import { deleteExtraTrip } from "./extra-trips-api";
import { TRIP_TYPE_LABELS, withTrip, withoutTrip } from "./extra-trip-form";
import { ExtraTripForm } from "./ExtraTripForm";

type Props = {
  /** その日の記録（追加の移動は、記録のある日にだけ足せる） */
  record: DailyRecord;
  routes: Route[];
  /** 移動を足した・直した・消した後の記録。親が一覧を置き換える */
  onChange: (record: DailyRecord) => void;
};

/** フォームの状態: 閉じている / 新しく足す / 1件を直す */
type FormState = { kind: "closed" } | { kind: "add" } | { kind: "edit"; trip: ExtraTrip };

/** 日の編集パネルの中の「追加の移動」。一覧と、足す・直す・消す */
export function ExtraTrips({ record, routes, onChange }: Props) {
  const [form, setForm] = useState<FormState>({ kind: "closed" });
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(trip: ExtraTrip) {
    if (!window.confirm(`${trip.from} → ${trip.to} の移動を消しますか？`)) return;
    setError(null);
    const result = await deleteExtraTrip(record.date, trip.id);
    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }
    onChange(withoutTrip(record, trip.id));
    if (form.kind === "edit" && form.trip.id === trip.id) setForm({ kind: "closed" });
  }

  return (
    <section className="extra-trips" aria-labelledby="extra-trips-heading">
      <h4 id="extra-trips-heading">追加の移動</h4>
      {record.extraTrips.length === 0 && form.kind === "closed" && <p className="muted">ありません</p>}
      {record.extraTrips.length > 0 && (
        <ul className="trip-list">
          {record.extraTrips.map((trip) => (
            <li key={trip.id} className={form.kind === "edit" && form.trip.id === trip.id ? "is-editing" : undefined}>
              <p className="trip-route">
                {trip.from} → {trip.to}
              </p>
              <p className="trip-meta">
                {TRANSPORT_LABELS[trip.transport]}・{TRIP_TYPE_LABELS[trip.tripType]}・
                <strong>{formatYen(extraTripFare(trip))}</strong>
              </p>
              {trip.purpose && <p className="trip-purpose">{trip.purpose}</p>}
              <div className="trip-actions">
                <button type="button" onClick={() => setForm({ kind: "edit", trip })}>
                  直す
                </button>
                <button type="button" className="danger" onClick={() => void handleDelete(trip)}>
                  消す
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}

      {form.kind === "closed" ? (
        <button type="button" className="trip-add" onClick={() => setForm({ kind: "add" })}>
          ＋ 追加の移動を足す
        </button>
      ) : (
        // key を変えると、足す ⇄ 直す（別の移動）を切り替えたときにフォームの欄が作り直される
        <ExtraTripForm
          key={form.kind === "edit" ? form.trip.id : "add"}
          date={record.date}
          routes={routes}
          editing={form.kind === "edit" ? form.trip : null}
          onSaved={(trip) => {
            onChange(withTrip(record, trip));
            setForm({ kind: "closed" });
          }}
          onCancel={() => setForm({ kind: "closed" })}
        />
      )}
    </section>
  );
}
