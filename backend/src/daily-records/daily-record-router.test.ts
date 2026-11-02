import type {
  ApiError,
  DailyRecord,
  ExtraTrip,
  ExtraTripInput,
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

const trip: ExtraTripInput = {
  from: "B駅",
  to: "C駅",
  transport: "bus",
  oneWayFare: 160,
  tripType: "roundTrip",
  purpose: "客先A",
};

describe("/api/daily-records", () => {
  let server: ReturnType<typeof startTestServer>;

  beforeEach(() => {
    server = startTestServer();
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

  async function createRoute(input: RouteInput = routeInput): Promise<Route> {
    return (await (await send("POST", "/routes", input)).json()) as Route;
  }

  async function fieldsOf(res: Response): Promise<string[] | undefined> {
    const body = (await res.json()) as ApiError;
    return body.fieldErrors?.map((e) => e.field);
  }

  describe("勤務区分の保存と月の取得", () => {
    it("在宅を保存すると 200 で記録が返り、その月の一覧に出る", async () => {
      const res = await send("PUT", "/daily-records/2026-11-02", { workStyle: { kind: "remote" } });
      expect(res.status).toBe(200);
      const saved = (await res.json()) as DailyRecord;
      expect(saved).toMatchObject({
        userId: "test-user",
        date: "2026-11-02",
        workStyle: { kind: "remote" },
        extraTrips: [],
      });

      const list = (await (await send("GET", "/daily-records?month=2026-11")).json()) as DailyRecord[];
      expect(list).toEqual([saved]);
    });

    it("出勤は routeId だけを送り、登録済みのルートの値がコピーされる", async () => {
      const route = await createRoute();
      const res = await send("PUT", "/daily-records/2026-11-02", {
        workStyle: { kind: "commute", routeId: route.id },
      });
      const saved = (await res.json()) as DailyRecord;
      expect(saved.workStyle).toEqual({
        kind: "commute",
        routeId: route.id,
        route: routeInput,
      });
    });

    it("ルートを後から直しても、記録したときの運賃のまま", async () => {
      const route = await createRoute();
      await send("PUT", "/daily-records/2026-11-02", {
        workStyle: { kind: "commute", routeId: route.id },
      });
      await send("PUT", `/routes/${route.id}`, { ...routeInput, oneWayFare: 999 });

      const [record] = (await (
        await send("GET", "/daily-records?month=2026-11")
      ).json()) as DailyRecord[];
      expect(record?.workStyle).toMatchObject({ route: { oneWayFare: 220 } });
    });

    it("登録されていないルートの出勤は 400", async () => {
      const res = await send("PUT", "/daily-records/2026-11-02", {
        workStyle: { kind: "commute", routeId: "no-such-route" },
      });
      expect(res.status).toBe(400);
      expect(await fieldsOf(res)).toEqual(["workStyle.routeId"]);
    });

    it("勤務区分の誤りは 400 で、どこが誤りかが返る", async () => {
      const unknownKind = await send("PUT", "/daily-records/2026-11-02", {
        workStyle: { kind: "vacation" },
      });
      expect(unknownKind.status).toBe(400);
      expect(await fieldsOf(unknownKind)).toEqual(["workStyle.kind"]);

      const noRoute = await send("PUT", "/daily-records/2026-11-02", {
        workStyle: { kind: "commute" },
      });
      expect(await fieldsOf(noRoute)).toEqual(["workStyle.routeId"]);

      const missing = await send("PUT", "/daily-records/2026-11-02", {});
      expect(await fieldsOf(missing)).toEqual(["workStyle"]);
    });

    it("実在しない日付は 400", async () => {
      const res = await send("PUT", "/daily-records/2026-02-30", { workStyle: { kind: "remote" } });
      expect(res.status).toBe(400);
      expect(await fieldsOf(res)).toEqual(["date"]);
    });

    it("月の指定が無い・形が違うと 400", async () => {
      expect((await send("GET", "/daily-records")).status).toBe(400);
      const res = await send("GET", "/daily-records?month=2026-13");
      expect(res.status).toBe(400);
      expect(await fieldsOf(res)).toEqual(["month"]);
    });
  });

  describe("記録の削除", () => {
    it("消すと 204 で、一覧から消える（未入力に戻る）", async () => {
      await send("PUT", "/daily-records/2026-11-02", { workStyle: { kind: "remote" } });
      expect((await send("DELETE", "/daily-records/2026-11-02")).status).toBe(204);

      const list = (await (await send("GET", "/daily-records?month=2026-11")).json()) as DailyRecord[];
      expect(list).toEqual([]);
    });

    it("記録が無い日を消そうとすると 404", async () => {
      expect((await send("DELETE", "/daily-records/2026-11-02")).status).toBe(404);
    });
  });

  describe("追加の移動", () => {
    beforeEach(async () => {
      await send("PUT", "/daily-records/2026-11-02", { workStyle: { kind: "remote" } });
    });

    it("足すと 201 で返り、勤務区分を保存し直しても残る", async () => {
      const res = await send("POST", "/daily-records/2026-11-02/extra-trips", trip);
      expect(res.status).toBe(201);
      const added = (await res.json()) as ExtraTrip;
      expect(added).toMatchObject(trip);

      const route = await createRoute();
      const saved = (await (
        await send("PUT", "/daily-records/2026-11-02", {
          workStyle: { kind: "commute", routeId: route.id },
        })
      ).json()) as DailyRecord;
      expect(saved.extraTrips).toEqual([added]);
    });

    it("直すと 200、消すと 204", async () => {
      const added = (await (
        await send("POST", "/daily-records/2026-11-02/extra-trips", trip)
      ).json()) as ExtraTrip;

      const res = await send("PUT", `/daily-records/2026-11-02/extra-trips/${added.id}`, {
        ...trip,
        oneWayFare: 180,
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ...trip, id: added.id, oneWayFare: 180 });

      expect(
        (await send("DELETE", `/daily-records/2026-11-02/extra-trips/${added.id}`)).status,
      ).toBe(204);
    });

    it("入力に誤りがあると 400 で、項目ごとの理由が返る", async () => {
      const res = await send("POST", "/daily-records/2026-11-02/extra-trips", {
        ...trip,
        from: " ",
        oneWayFare: 1.5,
        tripType: "both",
      });
      expect(res.status).toBe(400);
      expect(await fieldsOf(res)).toEqual(["from", "oneWayFare", "tripType"]);
    });

    it("記録が無い日に足そうとすると 404", async () => {
      expect((await send("POST", "/daily-records/2026-11-03/extra-trips", trip)).status).toBe(404);
    });

    it("見つからない移動を直す・消すと 404", async () => {
      expect((await send("PUT", "/daily-records/2026-11-02/extra-trips/nope", trip)).status).toBe(
        404,
      );
      expect((await send("DELETE", "/daily-records/2026-11-02/extra-trips/nope")).status).toBe(404);
    });
  });
});
