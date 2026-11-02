import type { Route, RouteInput } from "@routepense/shared";

/**
 * ルートの保存と読み出しの窓口。
 * API はこのインターフェースだけを使い、SQLite のことを知らない。
 * そのため、DB を差し替えるときは、このインターフェースを実装する別のクラスを作ればよい。
 */
export interface RouteRepository {
  list(userId: string): Route[];
  get(userId: string, id: string): Route | undefined;
  create(userId: string, input: RouteInput): Route;
  /** 見つからなければ undefined */
  update(userId: string, id: string, input: RouteInput): Route | undefined;
  /** 消せたら true、見つからなければ false */
  delete(userId: string, id: string): boolean;
}
