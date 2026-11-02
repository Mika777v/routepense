import type { FieldError } from "@routepense/shared";

/** 経路検索の駅の欄（ルートの出発地・到着地とは別に持つ。保存はしない） */
export type StationValues = {
  from: string;
  to: string;
};

/** 駅の欄ごとのエラーの文と、欄に結び付かないエラー */
export type StationErrors = {
  from?: string;
  to?: string;
  other: string[];
};

/**
 * 経路検索に使う駅名を決める。駅の欄が空なら、ルートの出発地・到着地を使う。
 * 出発地が「自宅」のように駅名でないときだけ、駅の欄に最寄りの駅を入れればよい。
 */
export function stationQuery(stations: StationValues, route: StationValues): StationValues {
  return {
    from: stations.from.trim() || route.from.trim(),
    to: stations.to.trim() || route.to.trim(),
  };
}

/**
 * 経路検索の API が返した fieldErrors を、駅の欄ごとのエラーに変える。
 * API の欄の名前は from / to で、ルートの出発地・到着地の欄と同じ名前なので、ルートのフォームのエラーとは分けて持つ。
 */
export function toStationErrors(fieldErrors: FieldError[]): StationErrors {
  const errors: StationErrors = { other: [] };
  for (const { field, message } of fieldErrors) {
    if (field === "from" || field === "to") {
      errors[field] ??= message;
    } else {
      errors.other.push(message);
    }
  }
  return errors;
}

/** URL の欄の値が、新しいタブで開ける URL か（http:// か https:// で始まる）。判定の本体は API が持つ */
export function isOpenableUrl(value: string): boolean {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) && URL.canParse(trimmed);
}
