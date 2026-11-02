import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app";
import { openDatabase } from "./db/database";
import { SqliteDailyRecordRepository } from "./daily-records/sqlite-daily-record-repository";
import { SqliteRouteRepository } from "./routes/sqlite-route-repository";

const port = Number(process.env.PORT ?? 3000);
// 既定では backend/data/routepense.db に保存する（*.db は .gitignore 済み）
const dbPath = process.env.DB_PATH ?? "data/routepense.db";
/** 認証はスコープ外なので、利用者は1人の固定値（要件定義 §2） */
const LOCAL_USER_ID = "local-user";

mkdirSync(dirname(dbPath), { recursive: true });
const db = openDatabase(dbPath);

// ここが組み立ての1か所。DB を替えるときは、ここで渡すリポジトリを替える
createApp({
  routes: new SqliteRouteRepository(db),
  dailyRecords: new SqliteDailyRecordRepository(db),
  userId: LOCAL_USER_ID,
}).listen(port, () => {
  console.log(`backend: http://localhost:${port}（DB: ${dbPath}）`);
});
