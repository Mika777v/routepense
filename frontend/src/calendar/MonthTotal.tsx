import type { MonthlyFare } from "@routepense/shared";
import { formatYen } from "../routes/route-form";

type Props = {
  fare: MonthlyFare;
  /** 未入力の日の数 */
  unentered: number;
  /** 一括設定の当てはめ中（まだ登録していない内容を合計に含んでいる）か */
  hasDraft: boolean;
};

/**
 * 月の交通費の合計。計算は shared の monthlyFare に任せ、この部品は表示だけを受け持つ。
 * 未入力の日が残っていると合計はまだ増えるかもしれないので、そのことも並べて出す。
 */
export function MonthTotal({ fare, unentered, hasDraft }: Props) {
  return (
    <section className="month-total" aria-labelledby="month-total-heading">
      <p className="month-total-main">
        <span id="month-total-heading">月の交通費</span>
        <strong>{formatYen(fare.total)}</strong>
        {hasDraft && <span className="month-total-draft">当てはめ中の内容を含む（未登録）</span>}
      </p>
      <p className="month-total-breakdown">
        内訳: 通常の交通費 {formatYen(fare.workStyleTotal)} ＋ 追加の移動 {formatYen(fare.extraTotal)}
      </p>
      <p className={unentered === 0 ? "month-total-status" : "month-total-status is-unentered"}>
        {unentered === 0
          ? "すべての日に入力があります"
          : `未入力の日が ${unentered}日 あります（合計はまだ確定していません）`}
      </p>
    </section>
  );
}
