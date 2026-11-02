import type { FieldError, Route, RouteInput, Transport } from "@routepense/shared";

/**
 * フォームの欄の値。画面の入力欄は文字列しか扱えないので、運賃も文字列で持つ。
 * 送るときに toRouteInput で RouteInput（運賃は number）に変える。
 */
export type RouteFormValues = {
  name: string;
  from: string;
  to: string;
  transport: Transport;
  oneWayFare: string;
  /** 経路結果のページの URL（任意）。空なら送らない */
  searchUrl: string;
};

/** 欄の名前（"name" | "from" | "to" | "transport" | "oneWayFare" | "searchUrl"） */
export type RouteFormField = keyof RouteFormValues;

/** 欄ごとのエラーの文。エラーの無い欄はキーが無い */
export type RouteFormErrors = Partial<Record<RouteFormField, string>>;

/**
 * 交通手段の表示名。Record<Transport, string> にしておくと、
 * TRANSPORTS に手段を足したときに、ここへ書き忘れると型エラーで気づける。
 */
export const TRANSPORT_LABELS: Record<Transport, string> = {
  train: "電車",
  bus: "バス",
  other: "その他",
};

export const emptyRouteForm: RouteFormValues = {
  name: "",
  from: "",
  to: "",
  transport: "train",
  oneWayFare: "",
  searchUrl: "",
};

/** 編集を始めるときに、登録済みのルートをフォームの値にする */
export function toRouteFormValues(route: Route): RouteFormValues {
  return {
    name: route.name,
    from: route.from,
    to: route.to,
    transport: route.transport,
    oneWayFare: String(route.oneWayFare),
    searchUrl: route.searchUrl ?? "",
  };
}

/**
 * フォームの値を、API に送る RouteInput に変える。
 * 正しいかどうかの判定は API（入力の境界）に任せ、ここでは型を合わせるだけにする。
 * 数として読めない運賃は NaN になり、JSON では null として送られるので、API が欄のエラーを返す。
 */
export function toRouteInput(values: RouteFormValues): RouteInput {
  const fare = values.oneWayFare.trim();
  const searchUrl = values.searchUrl.trim();
  return {
    name: values.name,
    from: values.from,
    to: values.to,
    transport: values.transport,
    oneWayFare: fare === "" ? Number.NaN : Number(fare),
    // 任意のプロパティは、値が無いときはキーごと付けない（空の文字列を送らない）
    ...(searchUrl !== "" && { searchUrl }),
  };
}

function isFormField(field: string): field is RouteFormField {
  return field in emptyRouteForm;
}

/**
 * API が返した fieldErrors を、欄ごとのエラーの文に変える。
 * 1つの欄に複数のエラーがあれば最初の1つだけを出す。欄に結び付かないエラーは other に集める。
 */
export function toRouteFormErrors(fieldErrors: FieldError[] | undefined): {
  byField: RouteFormErrors;
  other: string[];
} {
  const byField: RouteFormErrors = {};
  const other: string[] = [];
  for (const { field, message } of fieldErrors ?? []) {
    if (isFormField(field)) {
      byField[field] ??= message;
    } else {
      other.push(message);
    }
  }
  return { byField, other };
}

/** 円の表示（例: 1,200円） */
export function formatYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}
