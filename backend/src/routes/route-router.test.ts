import type { ApiError, Route, RouteInput } from "@routepense/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTestServer } from "../test-server";

const input: RouteInput = {
  name: "自宅↔本社",
  from: "A駅",
  to: "B駅",
  transport: "train",
  oneWayFare: 220,
};

describe("/api/routes", () => {
  let server: ReturnType<typeof startTestServer>;
  let url: string;

  beforeEach(() => {
    server = startTestServer();
    url = `${server.baseUrl}/api/routes`;
  });

  afterEach(() => {
    server.close();
  });

  function send(method: string, path: string, body?: unknown, raw?: string) {
    return fetch(`${url}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  }

  it("登録すると 201 で登録した値が返り、一覧に出る", async () => {
    const res = await send("POST", "", input);
    expect(res.status).toBe(201);
    const created = (await res.json()) as Route;
    expect(created).toMatchObject(input);
    expect(created.userId).toBe("test-user");

    const list = (await (await send("GET", "")).json()) as Route[];
    expect(list).toEqual([created]);
  });

  it("入力に誤りがあると 400 で、項目ごとの理由が返る", async () => {
    const res = await send("POST", "", { ...input, name: " ", oneWayFare: -1 });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiError;
    expect(body.fieldErrors?.map((e) => e.field)).toEqual(["name", "oneWayFare"]);
  });

  it("JSON として読めない本文は 400", async () => {
    const res = await send("POST", "", undefined, "{ not json");
    expect(res.status).toBe(400);
  });

  it("編集すると 200 で新しい値が返る", async () => {
    const created = (await (await send("POST", "", input)).json()) as Route;

    const res = await send("PUT", `/${created.id}`, { ...input, oneWayFare: 230 });
    expect(res.status).toBe(200);
    expect(((await res.json()) as Route).oneWayFare).toBe(230);
  });

  it("無いルートの編集・削除は 404", async () => {
    expect((await send("PUT", "/missing", input)).status).toBe(404);
    expect((await send("DELETE", "/missing")).status).toBe(404);
  });

  it("削除すると 204 で、一覧から消える", async () => {
    const created = (await (await send("POST", "", input)).json()) as Route;

    expect((await send("DELETE", `/${created.id}`)).status).toBe(204);
    expect(await (await send("GET", "")).json()).toEqual([]);
  });
});
