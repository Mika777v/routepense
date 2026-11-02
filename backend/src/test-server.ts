import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app";
import { openDatabase } from "./db/database";
import { SqliteRouteRepository } from "./routes/sqlite-route-repository";

/** テスト用に、使い捨ての DB でアプリを空いているポートで起動する */
export function startTestServer(): { baseUrl: string; close: () => void } {
  const db = openDatabase(":memory:");
  const server: Server = createApp({ routes: new SqliteRouteRepository(db), userId: "test-user" }).listen(0);
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://localhost:${port}`,
    close: () => {
      server.close();
      db.close();
    },
  };
}
