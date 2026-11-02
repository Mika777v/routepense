import type { RouteSearch, RouteSearchOutcome } from "./route-search";

/** キーが無いときの実装。いつも「使えない」と返す。CI・テスト・キーの無い環境ではこれを使う */
export class UnavailableRouteSearch implements RouteSearch {
  readonly available = false;

  search(): Promise<RouteSearchOutcome> {
    return Promise.resolve({ kind: "unavailable" });
  }
}
