/**
 * テーブルを作る SQL を、番号順に並べたもの。
 * 一度 main に入れた番号の SQL は書き換えず、変えたいときは新しい番号を足す。
 * どこまで適用したかは、SQLite の PRAGMA user_version に記録する。
 */
export const migrations: readonly { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE routes (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL,
        name         TEXT NOT NULL,
        from_place   TEXT NOT NULL,
        to_place     TEXT NOT NULL,
        transport    TEXT NOT NULL CHECK (transport IN ('train', 'bus', 'other')),
        one_way_fare INTEGER NOT NULL CHECK (one_way_fare >= 0),
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
      CREATE INDEX routes_user_id ON routes (user_id);
    `,
  },
];
