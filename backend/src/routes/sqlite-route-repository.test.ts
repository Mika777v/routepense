import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { RouteInput } from "@routepense/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/database";
import { migrations } from "../db/migrations";
import { SqliteRouteRepository } from "./sqlite-route-repository";

const input: RouteInput = {
  name: "自宅↔本社",
  from: "A駅",
  to: "B駅",
  transport: "train",
  oneWayFare: 220,
};

describe("SqliteRouteRepository", () => {
  let db: DatabaseSync;
  let repo: SqliteRouteRepository;
  let tick: number;

  beforeEach(() => {
    db = openDatabase(":memory:");
    // 登録した順に並ぶことを確かめるため、時刻を1秒ずつ進める
    tick = 0;
    repo = new SqliteRouteRepository(db, () => new Date(Date.UTC(2026, 10, 1, 0, 0, tick++)));
  });

  it("登録したルートを一覧と1件取得で読み出せる", () => {
    const created = repo.create("user-1", input);

    expect(created).toMatchObject({ userId: "user-1", ...input });
    expect(repo.list("user-1")).toEqual([created]);
    expect(repo.get("user-1", created.id)).toEqual(created);
  });

  it("一覧は登録した順に並ぶ", () => {
    const a = repo.create("user-1", { ...input, name: "A" });
    const b = repo.create("user-1", { ...input, name: "B" });

    expect(repo.list("user-1").map((r) => r.id)).toEqual([a.id, b.id]);
  });

  it("ほかのユーザーのルートは見えない", () => {
    const created = repo.create("user-1", input);

    expect(repo.list("user-2")).toEqual([]);
    expect(repo.get("user-2", created.id)).toBeUndefined();
  });

  it("編集すると値が変わる", () => {
    const created = repo.create("user-1", input);
    const updated = repo.update("user-1", created.id, { ...input, oneWayFare: 230 });

    expect(updated?.oneWayFare).toBe(230);
    expect(repo.get("user-1", created.id)?.oneWayFare).toBe(230);
  });

  it("無いルートの編集は undefined", () => {
    expect(repo.update("user-1", "missing", input)).toBeUndefined();
  });

  it("削除すると読み出せなくなる", () => {
    const created = repo.create("user-1", input);

    expect(repo.delete("user-1", created.id)).toBe(true);
    expect(repo.get("user-1", created.id)).toBeUndefined();
    expect(repo.delete("user-1", created.id)).toBe(false);
  });

  it("DB の制約で、マイナスの運賃は保存できない", () => {
    expect(() => repo.create("user-1", { ...input, oneWayFare: -1 })).toThrow();
  });
});

describe("openDatabase", () => {
  it("同じファイルを2回開いても、マイグレーションは1回だけ適用され、データは残る", () => {
    const dir = mkdtempSync(join(tmpdir(), "routepense-"));
    const file = join(dir, "test.db");
    try {
      const first = openDatabase(file);
      new SqliteRouteRepository(first).create("user-1", input);
      first.close();

      // 2回目にも CREATE TABLE が走ると「table routes already exists」で落ちる
      const second = openDatabase(file);
      const version = second.prepare("PRAGMA user_version").get() as { user_version: number };
      expect(version.user_version).toBe(migrations.at(-1)?.version);
      expect(new SqliteRouteRepository(second).list("user-1")).toHaveLength(1);
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
