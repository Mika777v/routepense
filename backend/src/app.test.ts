import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { HealthResponse } from "@routepense/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("GET /api/health", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(() => {
    // ポート 0 を渡すと、空いているポートを OS が選ぶ
    server = createApp().listen(0);
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("status: ok を返す", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as HealthResponse;
    expect(body.status).toBe("ok");
  });
});
