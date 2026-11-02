import { dayLabel } from "./day-edit";
import type { DraftSummary } from "./draft";

type Props = {
  /** 当てはめ中の日数 */
  count: number;
  /** 「登録」を押した後の確認の内容（確認中でなければ null） */
  confirming: DraftSummary | null;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onConfirm: () => void;
  onBack: () => void;
  onDiscard: () => void;
};

/**
 * 当てはめ中（未保存）であることを示し、「登録」と「取り消す」を置く帯。
 * すでに記録がある日を上書きするときは、登録の前に日数と、追加の移動がある日を示して確かめる（要件定義 F3）。
 */
export function DraftBar({ count, confirming, saving, error, onSave, onConfirm, onBack, onDiscard }: Props) {
  return (
    <div className="draft-bar" role="region" aria-label="当てはめ中の内容">
      {confirming ? (
        <div className="draft-confirm">
          <p className="draft-title">{confirming.overwrittenDates.length}日分を上書きします</p>
          <p>上書きするのは勤務区分だけです。追加の移動は残ります。</p>
          {confirming.datesWithExtraTrips.length > 0 && (
            <p>
              追加の移動がある日: {confirming.datesWithExtraTrips.map(dayLabel).join("、")}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="primary" disabled={saving} onClick={onConfirm}>
              {saving ? "登録しています…" : "上書きして登録"}
            </button>
            <button type="button" disabled={saving} onClick={onBack}>
              戻る
            </button>
          </div>
        </div>
      ) : (
        <div className="draft-summary">
          <p className="draft-title">当てはめ中: {count}日（まだ保存していません）</p>
          <p className="muted">日を押すと、1日ずつ直せます。</p>
          <div className="form-actions">
            <button type="button" className="primary" disabled={saving} onClick={onSave}>
              {saving ? "登録しています…" : "登録"}
            </button>
            <button type="button" disabled={saving} onClick={onDiscard}>
              取り消す
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
