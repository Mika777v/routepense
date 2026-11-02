import type { WorkStyle, WorkStyleInput } from "@routepense/shared";
import type { RouteRepository } from "../routes/route-repository";

/**
 * 画面から届いた勤務区分を、保存する形に変える。
 * 出勤なら、登録済みのルートの値をその時点でコピーする（後でルートを直しても、記録は変わらない）。
 * ルートが見つからなければ undefined。
 */
export function resolveWorkStyle(
  input: WorkStyleInput,
  routes: RouteRepository,
  userId: string,
): WorkStyle | undefined {
  if (input.kind !== "commute") {
    return input;
  }
  const route = routes.get(userId, input.routeId);
  if (route === undefined) {
    return undefined;
  }
  const { name, from, to, transport, oneWayFare } = route;
  return {
    kind: "commute",
    routeId: route.id,
    route: { name, from, to, transport, oneWayFare },
  };
}
