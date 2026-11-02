import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app";
import { openDatabase } from "./db/database";
import { SqliteDailyRecordRepository } from "./daily-records/sqlite-daily-record-repository";
import type { RouteSearch } from "./route-search/route-search";
import { UnavailableRouteSearch } from "./route-search/unavailable-route-search";
import { SqliteRouteRepository } from "./routes/sqlite-route-repository";

/**
 * テスト用に、使い捨ての DB でアプリを空いているポートで起動する。
 * 経路検索は、渡さなければ「使えない」実装（外部の API を呼ばない）
 */
export function startTestServer(routeSearch: RouteSearch = new UnavailableRouteSearch()): { baseUrl: string; close: () => void } {
  const db = openDatabase(":memory:");
  const server: Server = createApp({
    routes: new SqliteRouteRepository(db),
    dailyRecords: new SqliteDailyRecordRepository(db),
    routeSearch,
    userId: "test-user",
  }).listen(0);
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://localhost:${port}`,
    close: () => {
      server.close();
      db.close();
    },
  };
}
