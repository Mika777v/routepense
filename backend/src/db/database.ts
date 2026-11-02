import { DatabaseSync } from "node:sqlite";
import { migrations } from "./migrations";

/**
 * SQLite のデータベースを開き、まだ適用していないマイグレーションを適用する。
 * path に ":memory:" を渡すと、メモリ上の使い捨ての DB になる（テスト用）。
 */
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: DatabaseSync): void {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (const m of migrations) {
    if (m.version <= row.user_version) continue;
    // 1つのマイグレーションは、全部成功するか、全部取り消されるかのどちらか
    db.exec("BEGIN");
    try {
      db.exec(m.sql);
      db.exec(`PRAGMA user_version = ${m.version}`);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}
