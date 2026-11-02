import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Route, RouteInput, Transport } from "@routepense/shared";
import type { RouteRepository } from "./route-repository";

/** routes テーブルの1行。列名は SQL の慣習に合わせて snake_case */
type RouteRow = {
  id: string;
  user_id: string;
  name: string;
  from_place: string;
  to_place: string;
  transport: Transport;
  one_way_fare: number;
};

function toRoute(row: RouteRow): Route {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    from: row.from_place,
    to: row.to_place,
    transport: row.transport,
    oneWayFare: row.one_way_fare,
  };
}

const COLUMNS = "id, user_id, name, from_place, to_place, transport, one_way_fare";

export class SqliteRouteRepository implements RouteRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(userId: string): Route[] {
    const rows = this.db
      .prepare(`SELECT ${COLUMNS} FROM routes WHERE user_id = ? ORDER BY created_at, id`)
      .all(userId) as RouteRow[];
    return rows.map(toRoute);
  }

  get(userId: string, id: string): Route | undefined {
    const row = this.db
      .prepare(`SELECT ${COLUMNS} FROM routes WHERE user_id = ? AND id = ?`)
      .get(userId, id) as RouteRow | undefined;
    return row ? toRoute(row) : undefined;
  }

  create(userId: string, input: RouteInput): Route {
    const id = randomUUID();
    const at = this.now().toISOString();
    this.db
      .prepare(
        `INSERT INTO routes (${COLUMNS}, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, userId, input.name, input.from, input.to, input.transport, input.oneWayFare, at, at);
    return { id, userId, ...input };
  }

  update(userId: string, id: string, input: RouteInput): Route | undefined {
    const result = this.db
      .prepare(
        `UPDATE routes
         SET name = ?, from_place = ?, to_place = ?, transport = ?, one_way_fare = ?, updated_at = ?
         WHERE user_id = ? AND id = ?`,
      )
      .run(
        input.name,
        input.from,
        input.to,
        input.transport,
        input.oneWayFare,
        this.now().toISOString(),
        userId,
        id,
      );
    return result.changes > 0 ? { id, userId, ...input } : undefined;
  }

  delete(userId: string, id: string): boolean {
    const result = this.db.prepare("DELETE FROM routes WHERE user_id = ? AND id = ?").run(userId, id);
    return result.changes > 0;
  }
}
