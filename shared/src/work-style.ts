import type { RouteSnapshot } from "./route";

/**
 * 勤務区分（判別可能なユニオン型）。
 * kind の値で、どの形かを見分ける。
 * 「未入力」はここに含めない。日次記録が存在しない日として表す。
 */
export type WorkStyle =
  | { kind: "remote" }
  | { kind: "commute"; routeId: string; route: RouteSnapshot }
  | { kind: "holiday" };

/** 勤務区分の種類だけを取り出した型: "remote" | "commute" | "holiday" */
export type WorkStyleKind = WorkStyle["kind"];
