/** GET /api/route-search/status の応答。画面は、使えるときだけ「経路を見る」を出す */
export type RouteSearchStatus = {
  available: boolean;
};

/** GET /api/route-search?from=…&to=… が見つかったときの応答（200） */
export type RouteSearchResponse = {
  /** 経路結果のページの URL（駅すぱあと for web など） */
  url: string;
  /** 片道運賃（円）。分かる実装のときだけ入る。駅すぱあとフリープランでは入らない */
  fare?: number;
};
