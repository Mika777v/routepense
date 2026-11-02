import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  assertNever,
  type DailyRecord,
  type DateString,
  type ExtraTrip,
  type ExtraTripInput,
  type Transport,
  type TripType,
  type WorkStyle,
  type WorkStyleKind,
} from "@routepense/shared";
import type { DailyRecordRepository } from "./daily-record-repository";

/** daily_records テーブルの1行 */
type DailyRecordRow = {
  id: string;
  user_id: string;
  date: string;
  work_kind: WorkStyleKind;
  route_id: string | null;
  route_name: string | null;
  route_from: string | null;
  route_to: string | null;
  route_transport: Transport | null;
  route_one_way_fare: number | null;
};

/** extra_trips テーブルの1行 */
type ExtraTripRow = {
  id: string;
  daily_record_id: string;
  from_place: string;
  to_place: string;
  transport: Transport;
  one_way_fare: number;
  trip_type: TripType;
  purpose: string | null;
  source_route_id: string | null;
};

const RECORD_COLUMNS =
  "id, user_id, date, work_kind, route_id, route_name, route_from, route_to, route_transport, route_one_way_fare";
const TRIP_COLUMNS =
  "id, daily_record_id, from_place, to_place, transport, one_way_fare, trip_type, purpose, source_route_id";

/** 行の列（平らな形）から、勤務区分（ユニオン型）を組み立てる */
function toWorkStyle(row: DailyRecordRow): WorkStyle {
  switch (row.work_kind) {
    case "remote":
      return { kind: "remote" };
    case "holiday":
      return { kind: "holiday" };
    case "commute": {
      const { route_id, route_name, route_from, route_to, route_transport, route_one_way_fare } =
        row;
      // テーブルの CHECK で、出勤ならルートの列が全部そろっていることを保証している。
      // それでも null なら DB が壊れているので、黙って続けずに止める
      if (
        route_id === null ||
        route_name === null ||
        route_from === null ||
        route_to === null ||
        route_transport === null ||
        route_one_way_fare === null
      ) {
        throw new Error(`出勤の記録にルートの値がありません: ${row.id}`);
      }
      return {
        kind: "commute",
        routeId: route_id,
        route: {
          name: route_name,
          from: route_from,
          to: route_to,
          transport: route_transport,
          oneWayFare: route_one_way_fare,
        },
      };
    }
    default:
      return assertNever(row.work_kind);
  }
}

/** 勤務区分（ユニオン型）を、行の列（平らな形）に分ける。出勤でなければルートの列は null */
function toRouteColumns(workStyle: WorkStyle): (string | number | null)[] {
  if (workStyle.kind !== "commute") {
    return [null, null, null, null, null, null];
  }
  const { route } = workStyle;
  return [workStyle.routeId, route.name, route.from, route.to, route.transport, route.oneWayFare];
}

function toExtraTrip(row: ExtraTripRow): ExtraTrip {
  return {
    id: row.id,
    from: row.from_place,
    to: row.to_place,
    transport: row.transport,
    oneWayFare: row.one_way_fare,
    tripType: row.trip_type,
    // 任意の項目は、値が無ければプロパティごと付けない（undefined を入れない）
    ...(row.purpose !== null && { purpose: row.purpose }),
    ...(row.source_route_id !== null && { sourceRouteId: row.source_route_id }),
  };
}

export class SqliteDailyRecordRepository implements DailyRecordRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listByMonth(userId: string, month: string): DailyRecord[] {
    // "2026-11" なら "2026-11-01" 〜 "2026-11-31"。YYYY-MM-DD は文字列のまま大小を比べられる
    const rows = this.db
      .prepare(
        `SELECT ${RECORD_COLUMNS} FROM daily_records
         WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date`,
      )
      .all(userId, `${month}-01`, `${month}-31`) as DailyRecordRow[];
    return this.withExtraTrips(rows);
  }

  get(userId: string, date: DateString): DailyRecord | undefined {
    const row = this.db
      .prepare(`SELECT ${RECORD_COLUMNS} FROM daily_records WHERE user_id = ? AND date = ?`)
      .get(userId, date) as DailyRecordRow | undefined;
    return row ? this.withExtraTrips([row])[0] : undefined;
  }

  saveWorkStyle(userId: string, date: DateString, workStyle: WorkStyle): DailyRecord {
    const at = this.now().toISOString();
    // 同じユーザー・同じ日の行があれば、勤務区分の列だけを書き換える（UPSERT）
    this.db
      .prepare(
        `INSERT INTO daily_records (${RECORD_COLUMNS}, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, date) DO UPDATE SET
           work_kind = excluded.work_kind,
           route_id = excluded.route_id,
           route_name = excluded.route_name,
           route_from = excluded.route_from,
           route_to = excluded.route_to,
           route_transport = excluded.route_transport,
           route_one_way_fare = excluded.route_one_way_fare,
           updated_at = excluded.updated_at`,
      )
      .run(randomUUID(), userId, date, workStyle.kind, ...toRouteColumns(workStyle), at, at);
    const saved = this.get(userId, date);
    if (saved === undefined) {
      throw new Error(`保存した記録が見つかりません: ${date}`);
    }
    return saved;
  }

  saveMany(userId: string, days: { date: DateString; workStyle: WorkStyle }[]): DailyRecord[] {
    // トランザクション: 全部の日を保存するか、1日も保存しないかのどちらか
    this.db.exec("BEGIN");
    try {
      const saved = days.map((day) => this.saveWorkStyle(userId, day.date, day.workStyle));
      this.db.exec("COMMIT");
      return saved.sort((a, b) => a.date.localeCompare(b.date));
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  delete(userId: string, date: DateString): boolean {
    // 追加の移動は、外部キーの ON DELETE CASCADE で一緒に消える
    const result = this.db
      .prepare("DELETE FROM daily_records WHERE user_id = ? AND date = ?")
      .run(userId, date);
    return result.changes > 0;
  }

  addExtraTrip(userId: string, date: DateString, input: ExtraTripInput): ExtraTrip | undefined {
    const record = this.db
      .prepare("SELECT id FROM daily_records WHERE user_id = ? AND date = ?")
      .get(userId, date) as { id: string } | undefined;
    if (record === undefined) {
      return undefined;
    }
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO extra_trips (${TRIP_COLUMNS}, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        record.id,
        input.from,
        input.to,
        input.transport,
        input.oneWayFare,
        input.tripType,
        input.purpose ?? null,
        input.sourceRouteId ?? null,
        this.now().toISOString(),
      );
    return { id, ...input };
  }

  updateExtraTrip(
    userId: string,
    date: DateString,
    tripId: string,
    input: ExtraTripInput,
  ): ExtraTrip | undefined {
    // 移動の id だけで探さず、ユーザーと日付の記録に属するものだけを書き換える
    const result = this.db
      .prepare(
        `UPDATE extra_trips
         SET from_place = ?, to_place = ?, transport = ?, one_way_fare = ?, trip_type = ?,
             purpose = ?, source_route_id = ?
         WHERE id = ? AND daily_record_id =
           (SELECT id FROM daily_records WHERE user_id = ? AND date = ?)`,
      )
      .run(
        input.from,
        input.to,
        input.transport,
        input.oneWayFare,
        input.tripType,
        input.purpose ?? null,
        input.sourceRouteId ?? null,
        tripId,
        userId,
        date,
      );
    return result.changes > 0 ? { id: tripId, ...input } : undefined;
  }

  deleteExtraTrip(userId: string, date: DateString, tripId: string): boolean {
    const result = this.db
      .prepare(
        `DELETE FROM extra_trips
         WHERE id = ? AND daily_record_id =
           (SELECT id FROM daily_records WHERE user_id = ? AND date = ?)`,
      )
      .run(tripId, userId, date);
    return result.changes > 0;
  }

  /** 記録の行に、それぞれの追加の移動を付ける（記録の数だけ SQL を投げないよう、まとめて読む） */
  private withExtraTrips(rows: DailyRecordRow[]): DailyRecord[] {
    if (rows.length === 0) {
      return [];
    }
    const placeholders = rows.map(() => "?").join(", ");
    const tripRows = this.db
      .prepare(
        `SELECT ${TRIP_COLUMNS} FROM extra_trips
         WHERE daily_record_id IN (${placeholders}) ORDER BY created_at, rowid`,
      )
      .all(...rows.map((row) => row.id)) as ExtraTripRow[];

    const tripsByRecord = new Map<string, ExtraTrip[]>();
    for (const tripRow of tripRows) {
      const trips = tripsByRecord.get(tripRow.daily_record_id) ?? [];
      trips.push(toExtraTrip(tripRow));
      tripsByRecord.set(tripRow.daily_record_id, trips);
    }

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      date: row.date,
      workStyle: toWorkStyle(row),
      extraTrips: tripsByRecord.get(row.id) ?? [],
    }));
  }
}
