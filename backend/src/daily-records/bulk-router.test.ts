import type {
  ApiError,
  BulkApplyResult,
  DailyRecord,
  ExtraTrip,
  Route,
  RouteInput,
} from "@routepense/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTestServer } from "../test-server";

const routeInput: RouteInput = {
  name: "自宅↔本社",
  from: "A駅",
  to: "B駅",
  transport: "train",
  oneWayFare: 220,
};

const WEEKDAYS = [1, 2, 3, 4, 5];

describe("/api/daily-records/bulk", () => {
  let server: ReturnType<typeof startTestServer>;
  let route: Route;

  beforeEach(async () => {
    server = startTestServer();
    route = (await (await send("POST", "/routes", routeInput)).json()) as Route;
  });

  afterEach(() => {
    server.close();
  });

  function send(method: string, path: string, body?: unknown) {
    return fetch(`${server.baseUrl}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function fieldsOf(res: Response): Promise<string[] | undefined> {
    return ((await res.json()) as ApiError).fieldErrors?.map((e) => e.field);
  }

  async function listNovember(): Promise<DailyRecord[]> {
    return (await (await send("GET", "/daily-records?month=2026-11")).json()) as DailyRecord[];
  }

  describe("POST /bulk/preview（下見）", () => {
    it("平日に出勤を当てはめた結果と、上書きの情報を返す。保存はしない", async () => {
      await send("PUT", "/daily-records/2026-11-02", { workStyle: { kind: "remote" } });
      const trip = (await (
        await send("POST", "/daily-records/2026-11-02/extra-trips", {
          from: "B駅",
          to: "C駅",
          transport: "bus",
          oneWayFare: 160,
          tripType: "oneWay",
        })
      ).json()) as ExtraTrip;

      const res = await send("POST", "/daily-records/bulk/preview", {
        startDate: "2026-11-01",
        endDate: "2026-11-08",
        weekdays: WEEKDAYS,
        workStyle: { kind: "commute", routeId: route.id },
      });
      expect(res.status).toBe(200);
      const preview = (await res.json()) as BulkApplyResult;

      expect(preview.records.map((r) => r.date)).toEqual([
        "2026-11-02",
        "2026-11-03",
        "2026-11-04",
        "2026-11-05",
        "2026-11-06",
      ]);
      expect(preview.records[0]).toEqual({
        date: "2026-11-02",
        workStyle: { kind: "commute", routeId: route.id, route: routeInput },
        extraTrips: [trip],
      });
      expect(preview.overwrittenDates).toEqual(["2026-11-02"]);
      expect(preview.datesWithExtraTrips).toEqual(["2026-11-02"]);

      // 下見なので、保存された記録は増えていない
      expect(await listNovember()).toHaveLength(1);
    });

    it("期間が月をまたぐ・終了日が開始日より前・曜日が無いと 400", async () => {
      const base = { weekdays: WEEKDAYS, workStyle: { kind: "remote" } };

      const crossMonth = await send("POST", "/daily-records/bulk/preview", {
        ...base,
        startDate: "2026-11-30",
        endDate: "2026-12-01",
      });
      expect(crossMonth.status).toBe(400);
      expect(await fieldsOf(crossMonth)).toEqual(["endDate"]);

      const reversed = await send("POST", "/daily-records/bulk/preview", {
        ...base,
        startDate: "2026-11-10",
        endDate: "2026-11-01",
      });
      expect(await fieldsOf(reversed)).toEqual(["endDate"]);

      const noWeekdays = await send("POST", "/daily-records/bulk/preview", {
        ...base,
        startDate: "2026-11-01",
        endDate: "2026-11-30",
        weekdays: [],
      });
      expect(await fieldsOf(noWeekdays)).toEqual(["weekdays"]);
    });

    it("曜日の数が範囲の外・日付が実在しない・ルートが無いと 400", async () => {
      const badWeekday = await send("POST", "/daily-records/bulk/preview", {
        startDate: "2026-02-30",
        endDate: "2026-11-30",
        weekdays: [1, 7],
        workStyle: { kind: "remote" },
      });
      expect(await fieldsOf(badWeekday)).toEqual(["startDate", "weekdays"]);

      const noRoute = await send("POST", "/daily-records/bulk/preview", {
        startDate: "2026-11-01",
        endDate: "2026-11-30",
        weekdays: WEEKDAYS,
        workStyle: { kind: "commute", routeId: "no-such-route" },
      });
      expect(noRoute.status).toBe(400);
      expect(await fieldsOf(noRoute)).toEqual(["workStyle.routeId"]);
    });
  });

  describe("POST /bulk（登録）", () => {
    it("日ごとの勤務区分をまとめて保存し、既存の日の追加の移動は残す", async () => {
      await send("PUT", "/daily-records/2026-11-02", { workStyle: { kind: "remote" } });
      const trip = (await (
        await send("POST", "/daily-records/2026-11-02/extra-trips", {
          from: "B駅",
          to: "C駅",
          transport: "bus",
          oneWayFare: 160,
          tripType: "oneWay",
        })
      ).json()) as ExtraTrip;

      const res = await send("POST", "/daily-records/bulk", {
        days: [
          { date: "2026-11-03", workStyle: { kind: "remote" } },
          { date: "2026-11-02", workStyle: { kind: "commute", routeId: route.id } },
          { date: "2026-11-07", workStyle: { kind: "holiday" } },
        ],
      });
      expect(res.status).toBe(200);
      const saved = (await res.json()) as DailyRecord[];
      expect(saved.map((r) => [r.date, r.workStyle.kind])).toEqual([
        ["2026-11-02", "commute"],
        ["2026-11-03", "remote"],
        ["2026-11-07", "holiday"],
      ]);
      expect(saved[0]?.extraTrips).toEqual([trip]);
      expect(await listNovember()).toEqual(saved);
    });

    it("登録されていないルートが1日でもあれば 400 で、どの日も保存しない", async () => {
      const res = await send("POST", "/daily-records/bulk", {
        days: [
          { date: "2026-11-02", workStyle: { kind: "remote" } },
          { date: "2026-11-03", workStyle: { kind: "commute", routeId: "no-such-route" } },
        ],
      });
      expect(res.status).toBe(400);
      expect(await fieldsOf(res)).toEqual(["days[1].workStyle.routeId"]);
      expect(await listNovember()).toEqual([]);
    });

    it("日が無い・同じ日が2回・月をまたぐ・日付や勤務区分の誤りは 400", async () => {
      expect(await fieldsOf(await send("POST", "/daily-records/bulk", { days: [] }))).toEqual([
        "days",
      ]);

      const duplicated = await send("POST", "/daily-records/bulk", {
        days: [
          { date: "2026-11-02", workStyle: { kind: "remote" } },
          { date: "2026-11-02", workStyle: { kind: "holiday" } },
        ],
      });
      expect(await fieldsOf(duplicated)).toEqual(["days[1].date"]);

      const crossMonth = await send("POST", "/daily-records/bulk", {
        days: [
          { date: "2026-11-30", workStyle: { kind: "remote" } },
          { date: "2026-12-01", workStyle: { kind: "remote" } },
        ],
      });
      expect(await fieldsOf(crossMonth)).toEqual(["days"]);

      const invalid = await send("POST", "/daily-records/bulk", {
        days: [
          { date: "2026-11-31", workStyle: { kind: "remote" } },
          { date: "2026-11-02", workStyle: { kind: "commute" } },
          "2026-11-03",
        ],
      });
      expect(await fieldsOf(invalid)).toEqual([
        "days[0].date",
        "days[1].workStyle.routeId",
        "days[2]",
      ]);
    });

    it("32日分以上は 400", async () => {
      const days = Array.from({ length: 32 }, () => ({
        date: "2026-11-02",
        workStyle: { kind: "remote" },
      }));
      const res = await send("POST", "/daily-records/bulk", { days });
      expect(await fieldsOf(res)).toEqual(["days"]);
    });
  });
});
