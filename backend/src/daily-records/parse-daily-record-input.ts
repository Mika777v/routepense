import type {
  ExtraTripInput,
  FieldError,
  TripType,
  WorkStyleInput,
} from "@routepense/shared";
import { fare, isRecord, optionalText, text, transport } from "../validation/fields";
import type { Result } from "../validation/result";

const notObject: FieldError[] = [{ field: "", message: "JSON のオブジェクトを送ってください" }];

/**
 * 勤務区分の入力を確かめる。kind の値で形を見分け、形ごとに要る項目を確かめる。
 * routeId が登録済みのルートかは、DB を見る必要があるので、ここでは確かめない（呼んだ側で確かめる）。
 */
export function parseWorkStyleInput(value: unknown, field = "workStyle"): Result<WorkStyleInput> {
  if (!isRecord(value)) {
    return { ok: false, errors: [{ field, message: "勤務区分を選んでください" }] };
  }
  switch (value.kind) {
    case "remote":
      return { ok: true, value: { kind: "remote" } };
    case "holiday":
      return { ok: true, value: { kind: "holiday" } };
    case "commute": {
      const routeId = value.routeId;
      if (typeof routeId !== "string" || routeId === "") {
        return { ok: false, errors: [{ field: `${field}.routeId`, message: "ルートを選んでください" }] };
      }
      return { ok: true, value: { kind: "commute", routeId } };
    }
    default:
      return {
        ok: false,
        errors: [{ field: `${field}.kind`, message: "勤務区分は在宅・出勤・休日から選んでください" }],
      };
  }
}

/** PUT /api/daily-records/:date の本文 { workStyle } を確かめる */
export function parseDailyRecordInput(body: unknown): Result<WorkStyleInput> {
  if (!isRecord(body)) {
    return { ok: false, errors: notObject };
  }
  return parseWorkStyleInput(body.workStyle);
}

function isTripType(value: unknown): value is TripType {
  return value === "oneWay" || value === "roundTrip";
}

/** 追加の移動の入力を確かめる */
export function parseExtraTripInput(body: unknown): Result<ExtraTripInput> {
  if (!isRecord(body)) {
    return { ok: false, errors: notObject };
  }

  const errors: FieldError[] = [];
  const from = text(body, "from", "出発地", errors);
  const to = text(body, "to", "到着地", errors);
  const t = transport(body, "transport", errors);
  const oneWayFare = fare(body, "oneWayFare", errors);
  const tripType = body.tripType;
  if (!isTripType(tripType)) {
    errors.push({ field: "tripType", message: "片道か往復かを選んでください" });
  }
  const purpose = optionalText(body, "purpose", "目的・メモ", errors);
  const sourceRouteId = optionalText(body, "sourceRouteId", "元のルート", errors);

  if (errors.length > 0 || t === undefined || oneWayFare === undefined || !isTripType(tripType)) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      from,
      to,
      transport: t,
      oneWayFare,
      tripType,
      // 任意の項目は、値があるときだけプロパティを付ける
      ...(purpose !== undefined && { purpose }),
      ...(sourceRouteId !== undefined && { sourceRouteId }),
    },
  };
}
