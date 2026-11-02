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
  {
    version: 2,
    sql: `
      -- 1日分の記録。ユーザーごとに1日1件。記録が無い日は「未入力」
      CREATE TABLE daily_records (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL,
        date         TEXT NOT NULL,
        work_kind    TEXT NOT NULL CHECK (work_kind IN ('remote', 'commute', 'holiday')),
        -- 出勤のときだけ、記録した時点のルートの値（RouteSnapshot）を持つ。
        -- ルートを消しても記録は残すので、routes への外部キーは張らない
        route_id           TEXT,
        route_name         TEXT,
        route_from         TEXT,
        route_to           TEXT,
        route_transport    TEXT CHECK (route_transport IN ('train', 'bus', 'other')),
        route_one_way_fare INTEGER CHECK (route_one_way_fare >= 0),
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        UNIQUE (user_id, date),
        -- 出勤ならルートの値が全部そろい、出勤でなければ全部空
        CHECK (
          (work_kind = 'commute' AND route_id IS NOT NULL AND route_name IS NOT NULL
            AND route_from IS NOT NULL AND route_to IS NOT NULL
            AND route_transport IS NOT NULL AND route_one_way_fare IS NOT NULL)
          OR
          (work_kind <> 'commute' AND route_id IS NULL AND route_name IS NULL
            AND route_from IS NULL AND route_to IS NULL
            AND route_transport IS NULL AND route_one_way_fare IS NULL)
        )
      );

      -- 日の記録に足す追加の移動（1日に0件以上）。日の記録を消すと一緒に消える
      CREATE TABLE extra_trips (
        id              TEXT PRIMARY KEY,
        daily_record_id TEXT NOT NULL REFERENCES daily_records (id) ON DELETE CASCADE,
        from_place      TEXT NOT NULL,
        to_place        TEXT NOT NULL,
        transport       TEXT NOT NULL CHECK (transport IN ('train', 'bus', 'other')),
        one_way_fare    INTEGER NOT NULL CHECK (one_way_fare >= 0),
        trip_type       TEXT NOT NULL CHECK (trip_type IN ('oneWay', 'roundTrip')),
        purpose         TEXT,
        source_route_id TEXT,
        created_at      TEXT NOT NULL
      );
      CREATE INDEX extra_trips_daily_record_id ON extra_trips (daily_record_id);
    `,
  },
];
