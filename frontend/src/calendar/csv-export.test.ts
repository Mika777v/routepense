import type { DailyRecord } from "@routepense/shared";
import { describe, expect, it } from "vitest";
import { buildCsvFile, csvExportNote } from "./csv-export";

const record: DailyRecord = {
  id: "r1",
  userId: "u1",
  date: "2026-11-04",
  workStyle: {
    kind: "commute",
    routeId: "route-1",
    route: { name: "自宅↔本社", from: "A駅", to: "B駅", transport: "train", oneWayFare: 220 },
  },
  extraTrips: [],
};

describe("buildCsvFile", () => {
  it("ファイル名は表示中の月、中身は保存済みの記録の明細", () => {
    const file = buildCsvFile("2026-11", [record]);
    expect(file.fileName).toBe("routepense-2026-11.csv");
    expect(file.text).toContain("2026-11-04,水,,出勤,通常,A駅,B駅,電車,往復,220,440,自宅↔本社,");
  });
});

describe("csvExportNote", () => {
  it("当てはめ中は、保存できない理由を出す（未入力より先）", () => {
    expect(csvExportNote(true, 3)).toContain("当てはめ中");
  });

  it("未入力の日があれば、その日数と CSV に入らないことを出す", () => {
    expect(csvExportNote(false, 3)).toBe("未入力の日（3日）は CSV に入りません");
  });

  it("どちらも無ければ何も出さない", () => {
    expect(csvExportNote(false, 0)).toBeNull();
  });
});
