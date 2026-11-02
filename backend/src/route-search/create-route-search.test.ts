import { describe, expect, it } from "vitest";
import { createRouteSearch } from "./create-route-search";
import { EkispertFreeRouteSearch } from "./ekispert-route-search";
import { UnavailableRouteSearch } from "./unavailable-route-search";

describe("createRouteSearch", () => {
  it("EKISPERT_API_KEY があれば駅すぱあとフリープラン、無い・空白だけなら使えない実装を選ぶ", () => {
    expect(createRouteSearch({ EKISPERT_API_KEY: "abc" })).toBeInstanceOf(EkispertFreeRouteSearch);
    expect(createRouteSearch({})).toBeInstanceOf(UnavailableRouteSearch);
    expect(createRouteSearch({ EKISPERT_API_KEY: "  " })).toBeInstanceOf(UnavailableRouteSearch);
  });
});
