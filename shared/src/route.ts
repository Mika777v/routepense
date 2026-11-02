/** 交通手段 */
export type Transport = "train" | "bus" | "other";

/** 登録しておく出勤ルート（例: 自宅↔本社） */
export type Route = {
  id: string;
  /** 持ち主。今は固定値（将来の複数ユーザーに備える） */
  userId: string;
  name: string;
  /** 出発地 */
  from: string;
  /** 到着地 */
  to: string;
  transport: Transport;
  /** 片道運賃（円・整数） */
  oneWayFare: number;
};

/**
 * 記録を作った時点のルートの値のコピー。
 * ルートを後から編集・削除しても、過去の記録の金額と区間が変わらないようにする。
 */
export type RouteSnapshot = Pick<Route, "name" | "from" | "to" | "transport" | "oneWayFare">;

/** ルートを登録・編集するときに送る値（id と userId はサーバーが決める） */
export type RouteInput = Omit<Route, "id" | "userId">;
