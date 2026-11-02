/** 入力のどこが、なぜだめだったか */
export type FieldError = {
  field: string;
  message: string;
};

/** API がエラーのときに返す本文 */
export type ApiError = {
  error: string;
  /** バリデーションのエラーのときだけ、項目ごとの理由が入る */
  fieldErrors?: FieldError[];
};
