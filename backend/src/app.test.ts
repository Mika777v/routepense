import type { HealthResponse } from "@routepense/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "./test-server";

describe("GET /api/health", () => {
  let server: ReturnType<typeof startTestServer>;

  beforeAll(() => {
    server = startTestServer();
  });

  afterAll(() => {
    server.close();
  });

  it("status: ok を返す", async () => {
    const res = await fetch(`${server.baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as HealthResponse;
    expect(body.status).toBe("ok");
  });
});
