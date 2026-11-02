// フロントとバックの両方が使う型を置く場所。
// ステップ2で、ルート・勤務区分・日次記録の型をここに足す。

/** GET /api/health の応答。フロントとバックが同じ型を使うことを確かめるための最小の例 */
export type HealthResponse = {
  status: "ok";
  time: string;
};
