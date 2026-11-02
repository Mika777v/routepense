import type { FieldError, RouteInput } from "@routepense/shared";
import { fare, isRecord, text, transport } from "../validation/fields";
import type { Result } from "../validation/result";

/**
 * API に届いた本文（中身が分からない unknown）を確かめ、RouteInput に変える。
 * 型は実行するときに消えるので、外から来た値は、ここで1つずつ確かめる必要がある。
 */
export function parseRouteInput(body: unknown): Result<RouteInput> {
  if (!isRecord(body)) {
    return { ok: false, errors: [{ field: "", message: "JSON のオブジェクトを送ってください" }] };
  }

  const errors: FieldError[] = [];
  const name = text(body, "name", "ルート名", errors);
  const from = text(body, "from", "出発地", errors);
  const to = text(body, "to", "到着地", errors);
  const t = transport(body, "transport", errors);
  const oneWayFare = fare(body, "oneWayFare", errors);

  if (errors.length > 0 || t === undefined || oneWayFare === undefined) {
    return { ok: false, errors };
  }
  return { ok: true, value: { name, from, to, transport: t, oneWayFare } };
}
