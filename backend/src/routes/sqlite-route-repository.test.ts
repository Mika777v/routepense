import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
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

  it("経路の URL を保存・変更・消去できる。URL が無いときは項目ごと無い", () => {
    const searchUrl = "https://example.com/result?from=A&to=B";
    const created = repo.create("user-1", { ...input, searchUrl });
    expect(repo.get("user-1", created.id)?.searchUrl).toBe(searchUrl);

    repo.update("user-1", created.id, { ...input, searchUrl: `${searchUrl}&v=2` });
    expect(repo.get("user-1", created.id)?.searchUrl).toBe(`${searchUrl}&v=2`);

    repo.update("user-1", created.id, input);
    const cleared = repo.get("user-1", created.id);
    expect(cleared).toEqual({ id: created.id, userId: "user-1", ...input });
    expect(cleared && "searchUrl" in cleared).toBe(false);
  });

  it("DB の制約で、マイナスの運賃は保存できない", () => {
    expect(() => repo.create("user-1", { ...input, oneWayFare: -1 })).toThrow();
  });
});

describe("openDatabase", () => {
  it("URL の列が無い古い DB のルートも、マイグレーションの後にそのまま読める", () => {
    const dir = mkdtempSync(join(tmpdir(), "routepense-"));
    const file = join(dir, "old.db");
    try {
      // version 2 までの DB を作り、その時点の列だけでルートを入れる
      const old = new DatabaseSync(file);
      for (const m of migrations.filter((m) => m.version <= 2)) old.exec(m.sql);
      old.exec("PRAGMA user_version = 2");
      old
        .prepare(
          `INSERT INTO routes (id, user_id, name, from_place, to_place, transport, one_way_fare, created_at, updated_at)
           VALUES ('r1', 'user-1', '自宅↔本社', 'A駅', 'B駅', 'train', 220, 'x', 'x')`,
        )
        .run();
      old.close();

      const db = openDatabase(file);
      expect(new SqliteRouteRepository(db).list("user-1")).toEqual([{ id: "r1", userId: "user-1", ...input }]);
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

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
