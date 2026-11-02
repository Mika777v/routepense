import type { FieldError } from "@routepense/shared";

/** 検証の結果。成功なら値、失敗なら項目ごとのエラーを持つ（判別可能なユニオン型） */
export type Result<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };
