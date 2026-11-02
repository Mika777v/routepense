import { EkispertFreeRouteSearch } from "./ekispert-route-search";
import type { RouteSearch } from "./route-search";
import { UnavailableRouteSearch } from "./unavailable-route-search";

/**
 * 環境変数から経路検索の実装を選ぶ。キーがあれば駅すぱあとフリープラン、無ければ「使えない」。
 * 有料のプランなどに替えるときは、ここに実装を1つ足す。
 */
export function createRouteSearch(env: Record<string, string | undefined>): RouteSearch {
  const key = env.EKISPERT_API_KEY?.trim();
  return key ? new EkispertFreeRouteSearch(key) : new UnavailableRouteSearch();
}
