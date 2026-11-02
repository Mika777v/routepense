import type {
  BulkPreviewRequest,
  BulkSaveRequest,
  FieldError,
  Weekday,
} from "@routepense/shared";
import { isDateString } from "../validation/date";
import { isRecord } from "../validation/fields";
import type { Result } from "../validation/result";
import { parseWorkStyleInput } from "./parse-daily-record-input";

const notObject: FieldError[] = [{ field: "", message: "JSON のオブジェクトを送ってください" }];
/** 1か月の日数の上限 */
const MAX_DAYS = 31;

function isWeekday(value: unknown): value is Weekday {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

/** 日付の "YYYY-MM" の部分 */
function monthOf(date: string): string {
  return date.slice(0, 7);
}

/**
 * 一括設定の下見の入力（期間・曜日・勤務区分）を確かめる。
 * - 開始日・終了日が実在する日で、終了日 ≥ 開始日、同じ月の中（要件定義 U8）
 * - 曜日は 0〜6 の整数で、1つ以上（重なりは1つにまとめる）
 */
export function parseBulkPreviewRequest(body: unknown): Result<BulkPreviewRequest> {
  if (!isRecord(body)) {
    return { ok: false, errors: notObject };
  }
  const errors: FieldError[] = [];

  const { startDate, endDate, weekdays } = body;
  if (!isDateString(startDate)) {
    errors.push({ field: "startDate", message: "開始日は YYYY-MM-DD の実在する日で指定してください" });
  }
  if (!isDateString(endDate)) {
    errors.push({ field: "endDate", message: "終了日は YYYY-MM-DD の実在する日で指定してください" });
  }
  if (isDateString(startDate) && isDateString(endDate)) {
    if (endDate < startDate) {
      errors.push({ field: "endDate", message: "終了日は開始日以降の日にしてください" });
    } else if (monthOf(startDate) !== monthOf(endDate)) {
      errors.push({ field: "endDate", message: "期間は同じ月の中で選んでください" });
    }
  }

  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    errors.push({ field: "weekdays", message: "曜日を1つ以上選んでください" });
  } else if (!weekdays.every(isWeekday)) {
    errors.push({ field: "weekdays", message: "曜日は 0（日）〜 6（土）の数で指定してください" });
  }

  const workStyle = parseWorkStyleInput(body.workStyle);
  if (!workStyle.ok) {
    errors.push(...workStyle.errors);
  }

  if (
    errors.length > 0 ||
    !isDateString(startDate) ||
    !isDateString(endDate) ||
    !Array.isArray(weekdays) ||
    !weekdays.every(isWeekday) ||
    !workStyle.ok
  ) {
    return { ok: false, errors };
  }
  // Set で重なりを除き、小さい順に並べる
  const unique = [...new Set(weekdays)].sort((a, b) => a - b);
  return { ok: true, value: { startDate, endDate, weekdays: unique, workStyle: workStyle.value } };
}

/**
 * 一括設定の「登録」の入力（日ごとの勤務区分の一覧）を確かめる。
 * - 1日以上・31日以下で、同じ日が2回出てこない
 * - 日付はすべて実在する日で、すべて同じ月の中
 */
export function parseBulkSaveRequest(body: unknown): Result<BulkSaveRequest> {
  if (!isRecord(body)) {
    return { ok: false, errors: notObject };
  }
  const { days } = body;
  if (!Array.isArray(days) || days.length === 0) {
    return { ok: false, errors: [{ field: "days", message: "登録する日を1日以上送ってください" }] };
  }
  if (days.length > MAX_DAYS) {
    return {
      ok: false,
      errors: [{ field: "days", message: `一度に登録できるのは${MAX_DAYS}日までです` }],
    };
  }

  const errors: FieldError[] = [];
  const value: BulkSaveRequest["days"] = [];
  const seen = new Set<string>();

  days.forEach((day: unknown, i) => {
    const field = `days[${i}]`;
    if (!isRecord(day)) {
      errors.push({ field, message: "日付と勤務区分を送ってください" });
      return;
    }
    const { date } = day;
    if (!isDateString(date)) {
      errors.push({ field: `${field}.date`, message: "日付は YYYY-MM-DD の実在する日で指定してください" });
    } else if (seen.has(date)) {
      errors.push({ field: `${field}.date`, message: "同じ日が2回あります" });
    } else {
      seen.add(date);
    }
    const workStyle = parseWorkStyleInput(day.workStyle, `${field}.workStyle`);
    if (!workStyle.ok) {
      errors.push(...workStyle.errors);
    }
    if (isDateString(date) && workStyle.ok) {
      value.push({ date, workStyle: workStyle.value });
    }
  });

  if (errors.length === 0 && new Set(value.map((day) => monthOf(day.date))).size > 1) {
    errors.push({ field: "days", message: "登録する日は同じ月の中にしてください" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { days: value } };
}
