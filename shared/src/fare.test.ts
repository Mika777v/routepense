import { describe, expect, it } from "vitest";
import type { ExtraTrip } from "./extra-trip";
import { dailyFare, extraTripFare, monthlyFare, workStyleFare } from "./fare";
import type { WorkStyle } from "./work-style";

const commute: WorkStyle = {
  kind: "commute",
  routeId: "route-1",
  route: {
    name: "自宅↔本社",
    from: "A駅",
    to: "B駅",
    transport: "train",
    oneWayFare: 220,
  },
};

function trip(overrides: Partial<ExtraTrip> = {}): ExtraTrip {
  return {
    id: "trip-1",
    from: "B駅",
    to: "C駅",
    transport: "train",
    oneWayFare: 160,
    tripType: "oneWay",
    ...overrides,
  };
}

describe("workStyleFare", () => {
  it("在宅は 0 円", () => {
    expect(workStyleFare({ kind: "remote" })).toBe(0);
  });

  it("休日は 0 円", () => {
    expect(workStyleFare({ kind: "holiday" })).toBe(0);
  });

  it("出勤は片道運賃の往復分", () => {
    expect(workStyleFare(commute)).toBe(440);
  });
});

describe("extraTripFare", () => {
  it("片道は片道運賃そのまま", () => {
    expect(extraTripFare(trip({ tripType: "oneWay" }))).toBe(160);
  });

  it("往復は片道運賃 × 2", () => {
    expect(extraTripFare(trip({ tripType: "roundTrip" }))).toBe(320);
  });
});

describe("dailyFare", () => {
  it("勤務区分の交通費と追加の移動を合計する", () => {
    const record = {
      workStyle: commute,
      extraTrips: [
        trip({ tripType: "oneWay" }),
        trip({ id: "trip-2", tripType: "roundTrip" }),
      ],
    };
    expect(dailyFare(record)).toBe(440 + 160 + 320);
  });

  it("休日でも追加の移動があれば、その分だけかかる", () => {
    expect(
      dailyFare({ workStyle: { kind: "holiday" }, extraTrips: [trip()] }),
    ).toBe(160);
  });

  it("追加の移動が無い在宅の日は 0 円", () => {
    expect(dailyFare({ workStyle: { kind: "remote" }, extraTrips: [] })).toBe(
      0,
    );
  });
});

describe("monthlyFare", () => {
  it("記録が無い月は、どれも 0 円", () => {
    expect(monthlyFare([])).toEqual({
      total: 0,
      workStyleTotal: 0,
      extraTotal: 0,
    });
  });

  it("通常の交通費と追加の移動を分けて足し、合計はその和になる", () => {
    const records = [
      { workStyle: commute, extraTrips: [] },
      { workStyle: commute, extraTrips: [trip({ tripType: "roundTrip" })] },
      { workStyle: { kind: "remote" } as const, extraTrips: [] },
      {
        workStyle: { kind: "holiday" } as const,
        extraTrips: [trip({ tripType: "oneWay" })],
      },
    ];
    expect(monthlyFare(records)).toEqual({
      total: 440 + (440 + 320) + 0 + 160,
      workStyleTotal: 440 + 440,
      extraTotal: 320 + 160,
    });
  });

  it("合計は、各日の dailyFare を足したものと同じ", () => {
    const records = [
      {
        workStyle: commute,
        extraTrips: [trip(), trip({ id: "trip-2", tripType: "roundTrip" })],
      },
      { workStyle: { kind: "remote" } as const, extraTrips: [trip()] },
    ];
    const sumOfDays = records.reduce(
      (sum, record) => sum + dailyFare(record),
      0,
    );
    expect(monthlyFare(records).total).toBe(sumOfDays);
  });
});
