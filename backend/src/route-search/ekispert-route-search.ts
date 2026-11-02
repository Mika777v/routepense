import type { RouteSearch, RouteSearchOutcome, RouteSearchQuery } from "./route-search";

/** fetch と同じ形の関数。テストでは外部の API を呼ばない偽物を渡す */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const BASE_URL = "https://api.ekispert.jp/v1/json/search/course/light";
/** 応答を待つ上限（ミリ秒） */
const TIMEOUT_MS = 10_000;

/**
 * 駅すぱあと API フリープランの実装。
 * 「駅すぱあと for web URL生成」（/search/course/light）で、経路結果のページの URL を受け取る。
 * フリープランは運賃の数値を返さないので、fare は入れない。
 * 仕様: https://docs.ekispert.com/v1/le/api/search/course/light.html
 */
export class EkispertFreeRouteSearch implements RouteSearch {
  readonly available = true;

  constructor(
    private readonly key: string,
    private readonly fetchFn: FetchLike = fetch,
  ) {}

  async search(query: RouteSearchQuery): Promise<RouteSearchOutcome> {
    // key・from・to は URLSearchParams が符号化する（駅名の日本語も含めて）
    const params = new URLSearchParams({ key: this.key, from: query.from, to: query.to });
    let res: Response;
    try {
      res = await this.fetchFn(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      return { kind: "failed", reason: "駅すぱあと API につながりませんでした" };
    }

    // 駅名が見つからないなど、条件の誤りは 400 で返る
    if (res.status === 400) return { kind: "notFound" };
    // 403 はキーの誤り・登録したドメインとの違い（localhost からも 403 になる）
    if (res.status === 403) return { kind: "failed", reason: "駅すぱあと API がキーを受け付けませんでした" };
    if (!res.ok) return { kind: "failed", reason: `駅すぱあと API が ${res.status} を返しました` };

    const url = resourceUri(await res.json().catch(() => undefined));
    if (url === undefined) return { kind: "failed", reason: "駅すぱあと API の応答を読み取れませんでした" };
    return { kind: "found", url };
  }
}

/** 応答の ResultSet.ResourceURI を取り出す。http(s) の URL でなければ undefined */
export function resourceUri(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("ResultSet" in body)) return undefined;
  const resultSet = body.ResultSet;
  if (typeof resultSet !== "object" || resultSet === null || !("ResourceURI" in resultSet)) return undefined;
  const uri = resultSet.ResourceURI;
  return typeof uri === "string" && /^https?:\/\//.test(uri) ? uri : undefined;
}
