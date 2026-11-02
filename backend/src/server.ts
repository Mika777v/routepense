import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app";
import { openDatabase } from "./db/database";
import { SqliteDailyRecordRepository } from "./daily-records/sqlite-daily-record-repository";
import { createRouteSearch } from "./route-search/create-route-search";
import { SqliteRouteRepository } from "./routes/sqlite-route-repository";

// backend/.env があれば、環境変数として読み込む（API のキーなど。.env は .gitignore 済み）
if (existsSync(".env")) process.loadEnvFile(".env");

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
  routeSearch: createRouteSearch(process.env),
  userId: LOCAL_USER_ID,
}).listen(port, () => {
  console.log(`backend: http://localhost:${port}（DB: ${dbPath}）`);
  console.log(`経路検索: ${process.env.EKISPERT_API_KEY?.trim() ? "駅すぱあと API フリープラン" : "使えない（EKISPERT_API_KEY が無い）"}`);
});
