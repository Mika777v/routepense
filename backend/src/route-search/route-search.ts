/** 経路検索に渡す条件（受け口で確かめた後の値） */
export type RouteSearchQuery = {
  /** 出発駅の名前 */
  from: string;
  /** 到着駅の名前 */
  to: string;
};

/**
 * 経路検索の結果。外部のサービスの失敗も「値」として返し、例外にしない（判別可能なユニオン型）。
 * 受け口は kind ごとに HTTP の状態コードを選ぶ。
 */
export type RouteSearchOutcome =
  | { kind: "found"; url: string; fare?: number }
  /** 駅名から経路が見つからなかった */
  | { kind: "notFound" }
  /** この環境では経路検索が使えない（キーが無いなど） */
  | { kind: "unavailable" }
  /** 外部のサービスにつながらない・想定外の応答 */
  | { kind: "failed"; reason: string };

/**
 * 経路検索のインターフェース（ADR-0002）。
 * 受け口はこの形だけを知っていて、どの会社の API を使うかは知らない。
 * 実装を替えるときは、組み立ての1か所（server.ts の createRouteSearch）で渡すものを替える。
 */
export interface RouteSearch {
  /** この環境で経路検索が使えるか。画面がボタンを出すかどうかに使う */
  readonly available: boolean;
  search(query: RouteSearchQuery): Promise<RouteSearchOutcome>;
}
