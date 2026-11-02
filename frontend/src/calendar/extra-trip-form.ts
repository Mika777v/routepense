import type { DailyRecord, ExtraTrip, ExtraTripInput, FieldError, Route, Transport, TripType } from "@routepense/shared";

/** 追加の移動のフォームの欄の値。運賃は入力欄のまま文字列で持つ（第5章と同じ考え方） */
export type ExtraTripFormValues = {
  from: string;
  to: string;
  transport: Transport;
  oneWayFare: string;
  tripType: TripType;
  purpose: string;
  /** ルートから選んだときの元のルート（手で入力したときは空） */
  sourceRouteId: string;
};

export type ExtraTripFormField = "from" | "to" | "transport" | "oneWayFare" | "tripType" | "purpose";
export type ExtraTripFormErrors = Partial<Record<ExtraTripFormField, string>>;

export const TRIP_TYPE_LABELS: Record<TripType, string> = { oneWay: "片道", roundTrip: "往復" };

/** 新しく足すときの値。客先へ行って戻ることが多いので、往復を選んでおく */
export const emptyExtraTripForm: ExtraTripFormValues = {
  from: "",
  to: "",
  transport: "train",
  oneWayFare: "",
  tripType: "roundTrip",
  purpose: "",
  sourceRouteId: "",
};

/**
 * 登録済みのルートを選んだとき。区間・交通手段・運賃を、選んだ時点の値でコピーする（要件定義 F4）。
 * 片道 / 往復と目的は、入力中の値を残す。
 */
export function fillFromRoute(values: ExtraTripFormValues, route: Route): ExtraTripFormValues {
  return {
    ...values,
    from: route.from,
    to: route.to,
    transport: route.transport,
    oneWayFare: String(route.oneWayFare),
    sourceRouteId: route.id,
  };
}

/** 編集を始めるときに、登録済みの移動をフォームの値にする */
export function toExtraTripFormValues(trip: ExtraTrip): ExtraTripFormValues {
  return {
    from: trip.from,
    to: trip.to,
    transport: trip.transport,
    oneWayFare: String(trip.oneWayFare),
    tripType: trip.tripType,
    purpose: trip.purpose ?? "",
    sourceRouteId: trip.sourceRouteId ?? "",
  };
}

/**
 * フォームの値を、API に送る形にする。正しいかの判定は API に任せる。
 * 任意の項目（目的・元のルート）は、空なら送らない。
 */
export function toExtraTripInput(values: ExtraTripFormValues): ExtraTripInput {
  const fare = values.oneWayFare.trim();
  const purpose = values.purpose.trim();
  return {
    from: values.from,
    to: values.to,
    transport: values.transport,
    oneWayFare: fare === "" ? Number.NaN : Number(fare),
    tripType: values.tripType,
    ...(purpose !== "" && { purpose }),
    ...(values.sourceRouteId !== "" && { sourceRouteId: values.sourceRouteId }),
  };
}

/** 入力中の値から、この移動の金額を出す（運賃が 0 以上の整数として読めなければ null） */
export function previewFare(values: Pick<ExtraTripFormValues, "oneWayFare" | "tripType">): number | null {
  const text = values.oneWayFare.trim();
  if (!/^\d+$/.test(text)) return null;
  const fare = Number(text);
  return values.tripType === "roundTrip" ? fare * 2 : fare;
}

const FORM_FIELDS: readonly string[] = ["from", "to", "transport", "oneWayFare", "tripType", "purpose"];

function isFormField(field: string): field is ExtraTripFormField {
  return FORM_FIELDS.includes(field);
}

/** API が返した fieldErrors を、欄ごとのエラーの文に変える */
export function toExtraTripFormErrors(fieldErrors: readonly FieldError[] | undefined): {
  byField: ExtraTripFormErrors;
  other: string[];
} {
  const byField: ExtraTripFormErrors = {};
  const other: string[] = [];
  for (const { field, message } of fieldErrors ?? []) {
    if (isFormField(field)) byField[field] ??= message;
    else other.push(message);
  }
  return { byField, other };
}

/** 保存した移動を記録に入れる（同じ id があれば置き換え、無ければ末尾に足す）。元の記録は変えない */
export function withTrip(record: DailyRecord, trip: ExtraTrip): DailyRecord {
  const exists = record.extraTrips.some((t) => t.id === trip.id);
  return {
    ...record,
    extraTrips: exists ? record.extraTrips.map((t) => (t.id === trip.id ? trip : t)) : [...record.extraTrips, trip],
  };
}

/** 移動を記録から除く */
export function withoutTrip(record: DailyRecord, tripId: string): DailyRecord {
  return { ...record, extraTrips: record.extraTrips.filter((t) => t.id !== tripId) };
}
