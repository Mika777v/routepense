import type { Transport } from "./route";

/** 片道 / 往復 */
export type TripType = "oneWay" | "roundTrip";

/** 通常ルートとは別に、日の記録に足す臨時の移動 */
export type ExtraTrip = {
  id: string;
  from: string;
  to: string;
  transport: Transport;
  /** 片道運賃（円・整数） */
  oneWayFare: number;
  tripType: TripType;
  /** 目的・メモ（任意） */
  purpose?: string;
  /** 登録済みのルートから選んだ場合の元ルート（任意） */
  sourceRouteId?: string;
};

/** 追加の移動を足す・直すときに送る値（id はサーバーが決める） */
export type ExtraTripInput = Omit<ExtraTrip, "id">;
