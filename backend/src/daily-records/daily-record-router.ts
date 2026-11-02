import type { ApiError, DailyRecord, FieldError } from "@routepense/shared";
import { Router, type Response } from "express";
import type { RouteRepository } from "../routes/route-repository";
import { isDateString, isMonthString } from "../validation/date";
import type { DailyRecordRepository } from "./daily-record-repository";
import { parseDailyRecordInput, parseExtraTripInput } from "./parse-daily-record-input";
import { resolveWorkStyle } from "./resolve-work-style";

const recordNotFound: ApiError = { error: "その日の記録が見つかりません" };
const tripNotFound: ApiError = { error: "追加の移動が見つかりません" };

function badRequest(res: Response, errors: FieldError[]): void {
  const body: ApiError = { error: "入力に誤りがあります", fieldErrors: errors };
  res.status(400).json(body);
}

const invalidDate: FieldError[] = [
  { field: "date", message: "日付は YYYY-MM-DD の実在する日で指定してください" },
];

/** /api/daily-records の API。月の記録の取得、1日分の保存・削除、追加の移動の追加・編集・削除 */
export function dailyRecordRouter(
  records: DailyRecordRepository,
  routes: RouteRepository,
  userId: string,
): Router {
  const router = Router();

  // GET /api/daily-records?month=2026-11
  router.get("/", (req, res) => {
    const month = req.query.month;
    if (!isMonthString(month)) {
      badRequest(res, [{ field: "month", message: "月は YYYY-MM で指定してください" }]);
      return;
    }
    const body: DailyRecord[] = records.listByMonth(userId, month);
    res.json(body);
  });

  // その日の勤務区分を保存する（無ければ作り、あれば勤務区分だけを置き換える）
  router.put("/:date", (req, res) => {
    const { date } = req.params;
    if (!isDateString(date)) {
      badRequest(res, invalidDate);
      return;
    }
    const parsed = parseDailyRecordInput(req.body);
    if (!parsed.ok) {
      badRequest(res, parsed.errors);
      return;
    }
    const workStyle = resolveWorkStyle(parsed.value, routes, userId);
    if (workStyle === undefined) {
      badRequest(res, [{ field: "workStyle.routeId", message: "選んだルートが見つかりません" }]);
      return;
    }
    res.json(records.saveWorkStyle(userId, date, workStyle));
  });

  // その日の記録を消して「未入力」に戻す
  router.delete("/:date", (req, res) => {
    const { date } = req.params;
    if (!isDateString(date)) {
      badRequest(res, invalidDate);
      return;
    }
    if (!records.delete(userId, date)) {
      res.status(404).json(recordNotFound);
      return;
    }
    res.status(204).end();
  });

  router.post("/:date/extra-trips", (req, res) => {
    const { date } = req.params;
    if (!isDateString(date)) {
      badRequest(res, invalidDate);
      return;
    }
    const parsed = parseExtraTripInput(req.body);
    if (!parsed.ok) {
      badRequest(res, parsed.errors);
      return;
    }
    const added = records.addExtraTrip(userId, date, parsed.value);
    if (added === undefined) {
      res.status(404).json(recordNotFound);
      return;
    }
    res.status(201).json(added);
  });

  router.put("/:date/extra-trips/:tripId", (req, res) => {
    const { date, tripId } = req.params;
    if (!isDateString(date)) {
      badRequest(res, invalidDate);
      return;
    }
    const parsed = parseExtraTripInput(req.body);
    if (!parsed.ok) {
      badRequest(res, parsed.errors);
      return;
    }
    const updated = records.updateExtraTrip(userId, date, tripId, parsed.value);
    if (updated === undefined) {
      res.status(404).json(tripNotFound);
      return;
    }
    res.json(updated);
  });

  router.delete("/:date/extra-trips/:tripId", (req, res) => {
    const { date, tripId } = req.params;
    if (!isDateString(date)) {
      badRequest(res, invalidDate);
      return;
    }
    if (!records.deleteExtraTrip(userId, date, tripId)) {
      res.status(404).json(tripNotFound);
      return;
    }
    res.status(204).end();
  });

  return router;
}
