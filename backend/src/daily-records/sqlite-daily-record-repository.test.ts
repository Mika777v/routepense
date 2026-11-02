import type { DatabaseSync } from "node:sqlite";
import type { ExtraTripInput, WorkStyle } from "@routepense/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/database";
import { SqliteDailyRecordRepository } from "./sqlite-daily-record-repository";

const commute: WorkStyle = {
  kind: "commute",
  routeId: "route-1",
  route: { name: "自宅↔本社", from: "A駅", to: "B駅", transport: "train", oneWayFare: 220 },
};

const trip: ExtraTripInput = {
  from: "B駅",
  to: "C駅",
  transport: "bus",
  oneWayFare: 160,
  tripType: "roundTrip",
  purpose: "客先A",
};

describe("SqliteDailyRecordRepository", () => {
  let db: DatabaseSync;
  let repo: SqliteDailyRecordRepository;
  let tick: number;

  beforeEach(() => {
    db = openDatabase(":memory:");
    tick = 0;
    repo = new SqliteDailyRecordRepository(db, () => new Date(Date.UTC(2026, 10, 1, 0, 0, tick++)));
  });

  it("勤務区分を保存すると、その日の記録として読み出せる", () => {
    const saved = repo.saveWorkStyle("user-1", "2026-11-02", commute);

    expect(saved).toMatchObject({
      userId: "user-1",
      date: "2026-11-02",
      workStyle: commute,
      extraTrips: [],
    });
    expect(repo.get("user-1", "2026-11-02")).toEqual(saved);
  });

  it("在宅・休日はルートの値を持たない", () => {
    expect(repo.saveWorkStyle("user-1", "2026-11-02", { kind: "remote" }).workStyle).toEqual({
      kind: "remote",
    });
    expect(repo.saveWorkStyle("user-1", "2026-11-03", { kind: "holiday" }).workStyle).toEqual({
      kind: "holiday",
    });
  });

  it("月を指定すると、その月の記録だけを日付の古い順に返す", () => {
    repo.saveWorkStyle("user-1", "2026-11-30", { kind: "remote" });
    repo.saveWorkStyle("user-1", "2026-11-01", { kind: "holiday" });
    repo.saveWorkStyle("user-1", "2026-10-31", { kind: "remote" });
    repo.saveWorkStyle("user-1", "2026-12-01", { kind: "remote" });

    expect(repo.listByMonth("user-1", "2026-11").map((r) => r.date)).toEqual([
      "2026-11-01",
      "2026-11-30",
    ]);
  });

  it("ほかのユーザーの記録は見えない", () => {
    repo.saveWorkStyle("user-2", "2026-11-02", { kind: "remote" });

    expect(repo.listByMonth("user-1", "2026-11")).toEqual([]);
    expect(repo.get("user-1", "2026-11-02")).toBeUndefined();
  });

  it("同じ日に保存し直すと、1件のまま勤務区分だけが置き換わり、追加の移動は残る", () => {
    const first = repo.saveWorkStyle("user-1", "2026-11-02", { kind: "remote" });
    const added = repo.addExtraTrip("user-1", "2026-11-02", trip);

    const second = repo.saveWorkStyle("user-1", "2026-11-02", commute);

    expect(second.id).toBe(first.id);
    expect(second.workStyle).toEqual(commute);
    expect(second.extraTrips).toEqual([added]);
    expect(repo.listByMonth("user-1", "2026-11")).toHaveLength(1);
  });

  it("出勤から在宅に変えると、ルートの値は消える", () => {
    repo.saveWorkStyle("user-1", "2026-11-02", commute);

    expect(repo.saveWorkStyle("user-1", "2026-11-02", { kind: "remote" }).workStyle).toEqual({
      kind: "remote",
    });
  });

  it("追加の移動は足した順に読み出せる。任意の項目が無ければプロパティも無い", () => {
    repo.saveWorkStyle("user-1", "2026-11-02", { kind: "remote" });
    const a = repo.addExtraTrip("user-1", "2026-11-02", trip);
    const b = repo.addExtraTrip("user-1", "2026-11-02", {
      from: "C駅",
      to: "A駅",
      transport: "train",
      oneWayFare: 300,
      tripType: "oneWay",
    });

    const [record] = repo.listByMonth("user-1", "2026-11");
    expect(record?.extraTrips).toEqual([a, b]);
    expect(record?.extraTrips[1]).not.toHaveProperty("purpose");
  });

  it("記録が無い日には、追加の移動を足せない", () => {
    expect(repo.addExtraTrip("user-1", "2026-11-02", trip)).toBeUndefined();
  });

  it("記録を消すと未入力に戻り、追加の移動も消える", () => {
    repo.saveWorkStyle("user-1", "2026-11-02", { kind: "remote" });
    repo.addExtraTrip("user-1", "2026-11-02", trip);

    expect(repo.delete("user-1", "2026-11-02")).toBe(true);
    expect(repo.get("user-1", "2026-11-02")).toBeUndefined();
    const left = db.prepare("SELECT COUNT(*) AS n FROM extra_trips").get() as { n: number };
    expect(left.n).toBe(0);
  });

  it("記録が無い日を消そうとすると false", () => {
    expect(repo.delete("user-1", "2026-11-02")).toBe(false);
  });

  it("テーブルの CHECK で、ルートの値が欠けた出勤の行は入らない", () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO daily_records (id, user_id, date, work_kind, created_at, updated_at)
           VALUES ('x', 'user-1', '2026-11-02', 'commute', '', '')`,
        )
        .run(),
    ).toThrow();
  });

  it("追加の移動を直す・消すことができる", () => {
    repo.saveWorkStyle("user-1", "2026-11-02", { kind: "remote" });
    const added = repo.addExtraTrip("user-1", "2026-11-02", trip);
    if (added === undefined) throw new Error("追加できていない");

    const withoutPurpose: ExtraTripInput = {
      from: trip.from,
      to: trip.to,
      transport: trip.transport,
      oneWayFare: trip.oneWayFare,
      tripType: trip.tripType,
    };
    const updated = repo.updateExtraTrip("user-1", "2026-11-02", added.id, {
      ...withoutPurpose,
      oneWayFare: 180,
    });
    expect(updated).toEqual({ ...withoutPurpose, id: added.id, oneWayFare: 180 });
    expect(repo.get("user-1", "2026-11-02")?.extraTrips).toEqual([updated]);

    expect(repo.deleteExtraTrip("user-1", "2026-11-02", added.id)).toBe(true);
    expect(repo.get("user-1", "2026-11-02")?.extraTrips).toEqual([]);
  });

  it("ほかの日・ほかのユーザーの追加の移動は、直せないし消せない", () => {
    repo.saveWorkStyle("user-1", "2026-11-02", { kind: "remote" });
    repo.saveWorkStyle("user-1", "2026-11-03", { kind: "remote" });
    const added = repo.addExtraTrip("user-1", "2026-11-02", trip);
    if (added === undefined) throw new Error("追加できていない");

    expect(repo.updateExtraTrip("user-1", "2026-11-03", added.id, trip)).toBeUndefined();
    expect(repo.updateExtraTrip("user-2", "2026-11-02", added.id, trip)).toBeUndefined();
    expect(repo.deleteExtraTrip("user-1", "2026-11-03", added.id)).toBe(false);
    expect(repo.deleteExtraTrip("user-2", "2026-11-02", added.id)).toBe(false);
    expect(repo.get("user-1", "2026-11-02")?.extraTrips).toEqual([added]);
  });
});
