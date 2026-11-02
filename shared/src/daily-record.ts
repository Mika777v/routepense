import type { DateString } from "./date";
import type { ExtraTrip } from "./extra-trip";
import type { WorkStyle } from "./work-style";

/** 1日分の記録。ユーザーごとに1日1件 */
export type DailyRecord = {
  id: string;
  userId: string;
  date: DateString;
  workStyle: WorkStyle;
  /** 追加の移動（0件以上） */
  extraTrips: ExtraTrip[];
};
