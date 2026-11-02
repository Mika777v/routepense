import { afterEach, describe, expect, it, vi } from "vitest";
import { addExtraTrip, deleteExtraTrip, updateExtraTrip } from "./extra-trips-api";

const input = { from: "中野", to: "新宿", transport: "train", oneWayFare: 170, tripType: "roundTrip" } as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("extra-trips-api", () => {
  it("足す・直す・消すで、その日の URL に送る", async () => {
    const fake = vi.fn(async () => new Response(JSON.stringify({ ...input, id: "t1" }), { status: 201 }));
    vi.stubGlobal("fetch", fake);
    expect((await addExtraTrip("2026-11-02", input)).ok).toBe(true);
    expect(fake).toHaveBeenLastCalledWith(
      "/api/daily-records/2026-11-02/extra-trips",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
    await updateExtraTrip("2026-11-02", "t 1", input);
    expect(fake).toHaveBeenLastCalledWith("/api/daily-records/2026-11-02/extra-trips/t%201", expect.objectContaining({ method: "PUT" }));
  });

  it("消す: 204 は本文なしの成功", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    expect(await deleteExtraTrip("2026-11-02", "t1")).toEqual({ ok: true, value: undefined });
  });
});
