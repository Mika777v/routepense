import type {
  BulkSaveRequest,
  DailyRecord,
  DailyRecordDraft,
  DateString,
  Route,
  WorkStyle,
  WorkStyleInput,
} from "@routepense/shared";
import { toWorkStyleInput } from "./day-edit";

/**
 * 当てはめた（まだ保存していない）勤務区分。日付 → 勤務区分。
 * 一括設定を何回か当てはめたり、日ごとに直したりした結果を、「登録」までここにためる。
 */
export type Draft = ReadonlyMap<DateString, WorkStyle>;

/** 下見の結果を、当てはめ中の内容に重ねる。同じ日は後から当てはめた方を使う */
export function mergeDraft(draft: Draft, records: readonly Pick<DailyRecordDraft, "date" | "workStyle">[]): Draft {
  const next = new Map(draft);
  for (const record of records) next.set(record.date, record.workStyle);
  return next;
}

/** 1日分を直す（workStyle が null なら、その日の当てはめを外して保存済みの状態に戻す） */
export function setDraftDay(draft: Draft, date: DateString, workStyle: WorkStyle | null): Draft {
  const next = new Map(draft);
  if (workStyle) next.set(date, workStyle);
  else next.delete(date);
  return next;
}

/**
 * パネルで選んだ勤務区分（API に送る形）を、カレンダーに出せる形にする。
 * 出勤はルートの値のコピーが要るので、ルートの一覧から引く。見つからなければ undefined
 */
export function toDraftWorkStyle(input: WorkStyleInput, routes: readonly Route[]): WorkStyle | undefined {
  if (input.kind !== "commute") return input;
  const route = routes.find((r) => r.id === input.routeId);
  if (!route) return undefined;
  const { name, from, to, transport, oneWayFare } = route;
  return { kind: "commute", routeId: route.id, route: { name, from, to, transport, oneWayFare } };
}

/**
 * カレンダーに出す記録の一覧。保存済みの記録に、当てはめ中の勤務区分を重ねる。
 * 追加の移動は保存済みの記録のものを残す（一括設定は勤務区分だけを上書きする。要件定義 F3）
 */
export function overlayDraft(saved: readonly DailyRecord[], draft: Draft): DailyRecord[] {
  const byDate = new Map(saved.map((record) => [record.date, record]));
  const drafted: DailyRecord[] = [...draft].map(([date, workStyle]) => {
    const current = byDate.get(date);
    return current
      ? { ...current, workStyle }
      : { id: `draft-${date}`, userId: "", date, workStyle, extraTrips: [] };
  });
  return [...saved.filter((record) => !draft.has(record.date)), ...drafted].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/** 「登録」の前に確かめる内容と、登録の API に送る本文 */
export type DraftSummary = {
  request: BulkSaveRequest;
  /** すでに記録があり、勤務区分を上書きする日 */
  overwrittenDates: DateString[];
  /** 上書きする日のうち、追加の移動がある日（追加の移動は残る） */
  datesWithExtraTrips: DateString[];
};

export function summarizeDraft(draft: Draft, saved: readonly DailyRecord[]): DraftSummary {
  const byDate = new Map(saved.map((record) => [record.date, record]));
  const dates = [...draft.keys()].sort();
  const overwritten = dates.filter((date) => byDate.has(date));
  return {
    request: {
      days: dates.flatMap((date) => {
        const workStyle = draft.get(date);
        return workStyle ? [{ date, workStyle: toWorkStyleInput(workStyle) }] : [];
      }),
    },
    overwrittenDates: overwritten,
    datesWithExtraTrips: overwritten.filter((date) => (byDate.get(date)?.extraTrips.length ?? 0) > 0),
  };
}
