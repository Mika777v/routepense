# 第4章 unknown と型ガード（入力の境界でのバリデーション）

## この章で学ぶこと

1. 外から来た値を `unknown` として受け取る理由
2. 型ガード（`typeof`・`value is T`）で、`unknown` を安全な型に絞り込む方法
3. 検証の結果を、判別可能なユニオン型（`Result`）で返す方法

## 前提知識

- 第1章（型消去）、第2章（判別可能なユニオン型とナローイング）
- Java の Bean Validation（`@NotBlank`・`@Min` など）と、`@RequestBody` での受け取り

| | Java（Spring） | TypeScript（Express） |
|---|---|---|
| 届いた JSON | フレームワークが、指定したクラスに変換してくれる。型が合わなければ変換の時点でエラー | ただの JavaScript の値になるだけ。**型の確認は何もされない** |
| 入力の検証 | `@Valid` とアノテーションで宣言する | 自分で確かめるコードを書く（またはライブラリを使う） |
| 実行するときの型の情報 | 残っている | 消えている（第1章の型消去） |

## 概念の説明

### なぜ境界で確かめるのか

**定義**: 境界（boundary）とは、プログラムの外から値が入ってくる場所です。API の受け口、ファイルの読み込み、DB から読んだ値などがあたります。

**理由**: TypeScript の型は、実行するときには消えています。`req.body` に「`RouteInput` 型だ」と書いても、送られてきた JSON が本当にその形かは、誰も確かめていません。そのため、外から来た値は**境界で1回だけ確かめ**、そこから内側では型を信じて使える状態にします（CLAUDE.md「バリデーションは入力の境界で行う」）。

### any と unknown

**定義**:
- `any` は「型チェックをしない」型です。何にでも代入でき、どんなプロパティも読めます
- `unknown` は「何が入っているか分からない」型です。**確かめるまで、ほとんど何もできません**

```ts
function withAny(body: any): RouteInput {
  return body; // 型エラーにならない。中身が違っても素通りする（危険）
}

function withUnknown(body: unknown): RouteInput {
  return body; // 型エラー（わざと間違えています）
}
```

`unknown` にしておけば、確かめるのを忘れたときに型エラーで気づけます。外から来た値は `unknown` として扱うのが安全です。

### 型ガード

**定義**: 型ガード（type guard）とは、`if` の条件で値を確かめることで、その分岐の中の型を絞り込む仕組みです（第2章のナローイングの一種）。

```ts
function length(value: unknown): number {
  if (typeof value === "string") {
    return value.length; // ここでは value は string
  }
  return 0;
}
```

よく使う型ガード:

| 書き方 | 絞り込まれる型 |
|---|---|
| `typeof v === "string"` | `string` |
| `typeof v === "number"` | `number` |
| `Array.isArray(v)` | `any[]` |
| `v !== null` | `null` を取り除いた型 |
| `"name" in v` | `name` を持つ型 |

### ユーザー定義の型ガード（value is T）

**定義**: 戻り値の型を `value is T` と書いた関数は、`true` を返したときに引数を `T` 型に絞り込みます。

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

`typeof value === "object"` だけでは足りません。JavaScript では `typeof null` も `"object"` になり、配列も `"object"` になるためです。

**注意**: `value is T` は「私が確かめたので信じてください」という約束です。関数の中身が間違っていても、TypeScript は気づきません。型ガードの関数は小さく保ち、テストを書きます。

## このプロジェクトでの実例

### parseRouteInput

`backend/src/routes/parse-route-input.ts` が、`POST /api/routes` と `PUT /api/routes/:id` の本文を確かめます。

```ts
export function parseRouteInput(body: unknown): Result<RouteInput> {
  if (!isRecord(body)) {
    return { ok: false, errors: [{ field: "", message: "JSON のオブジェクトを送ってください" }] };
  }
  // name・from・to・transport・oneWayFare を1つずつ確かめる
  // ...
  return { ok: true, value: { name, from, to, transport, oneWayFare } };
}
```

- 引数は `unknown`。Express の `req.body` は `any` ですが、ここで `unknown` として受け取るので、確かめ忘れが型エラーになります
- 返す値は、確かめた項目だけで**新しく組み立てる**。送られてきた本文に `userId` などの余分な項目があっても、取り込まれません（`parse-route-input.test.ts` の「余分な項目は取り込まない」）
- 誤りは最初の1つで止めず、全部まとめて返します。画面で、すべての欄に一度にエラーを出せるようにするためです

### ユニオン型の入力を確かめる（parseWorkStyleInput）

`backend/src/daily-records/parse-daily-record-input.ts` は、勤務区分（第2章の判別可能なユニオン型）の入力を確かめます。`kind` の値で形を見分け、**形ごとに要る項目だけ**を確かめます。

```ts
export function parseWorkStyleInput(value: unknown, field = "workStyle"): Result<WorkStyleInput> {
  if (!isRecord(value)) {
    return { ok: false, errors: [{ field, message: "勤務区分を選んでください" }] };
  }
  switch (value.kind) {
    case "remote":
      return { ok: true, value: { kind: "remote" } };
    case "commute": {
      const routeId = value.routeId; // ここではまだ unknown
      if (typeof routeId !== "string" || routeId === "") {
        return { ok: false, errors: [{ field: `${field}.routeId`, message: "ルートを選んでください" }] };
      }
      return { ok: true, value: { kind: "commute", routeId } }; // ここでは string
    }
    // holiday と、どれでもないとき（default）は省略
  }
}
```

- `isRecord` を通った後の `value` は `Record<string, unknown>` なので、`value.kind` も `value.routeId` も `unknown` です。`switch` で `kind` を比べても、`routeId` は確かめるまで `unknown` のままです
- 出勤のとき画面が送るのは `routeId` だけです（`WorkStyleInput`）。ルートの名前や運賃は、サーバーが登録済みのルートから写します（`resolve-work-style.ts`）。画面が古い運賃を送ってきても、保存されるのは登録済みの値になります
- 日付の確かめ（`backend/src/validation/date.ts` の `isDateString`）も `value is DateString` の型ガードです。形（`/^\d{4}-\d{2}-\d{2}$/`）だけでなく、`Date.UTC` で作った日付を文字列に戻して元と同じかを比べ、`2026-02-30` のような実在しない日もはじきます

### 結果を判別可能なユニオン型で返す

`backend/src/validation/result.ts`:

```ts
export type Result<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };
```

`T` は**ジェネリクス**（型を引数のように受け取る仕組み。Java の `List<T>` と同じ考え方）です。使う側は `ok` で分岐します。

```ts
const parsed = parseRouteInput(req.body);
if (!parsed.ok) {
  res.status(400).json({ error: "入力に誤りがあります", fieldErrors: parsed.errors });
  return;
}
repo.create(userId, parsed.value); // ここでは parsed は { ok: true; value: RouteInput }
```

Java なら、検証に失敗したときに例外を投げることが多いです。`Result` で返すと、「失敗するかもしれない」ことが型に表れるので、エラーの扱いを忘れると型エラーになります（`parsed.value` は `ok` を確かめるまで読めません）。

### 一覧と型を1か所から作る

`shared/src/route.ts`:

```ts
export const TRANSPORTS = ["train", "bus", "other"] as const;
export type Transport = (typeof TRANSPORTS)[number]; // "train" | "bus" | "other"
```

- `as const` を付けると、配列が `string[]` ではなく、中身が決まった読み取り専用の配列 `readonly ["train", "bus", "other"]` になります
- `typeof TRANSPORTS` で値から型を取り出し、`[number]` で要素の型を取り出します
- バリデーションの「決まった3つだけ」の確認（`isTransport`）と型が同じ一覧から作られるので、交通手段を足すときに片方だけ直し忘れることがありません

## よくある間違いと、型エラーの読み方

以下のエラーは、実際に `tsc` で出したものです（コードはわざと間違えています）。

### 1. unknown のまま、プロパティを読もうとする

```ts
function f(body: unknown) {
  return body.name; // 型エラー（わざと間違えています）
}
```

```text
error TS18046: 'body' is of type 'unknown'.
```

読み方: 「`body` は中身の分からない値なので、`.name` は読めない」。先に型ガードで確かめます。

### 2. 確かめずに、そのまま返そうとする

```text
error TS2322: Type 'unknown' is not assignable to type 'RouteInput'.
```

読み方: 「`unknown` を `RouteInput` として返せない」。確かめた値で組み立て直します。

### 3. typeof === "object" だけで済ませる

```ts
function f(body: unknown) {
  if (typeof body === "object") {
    return body.name; // 型エラー（わざと間違えています）
  }
}
```

```text
error TS18047: 'body' is possibly 'null'.
error TS2339: Property 'name' does not exist on type 'object'.
```

読み方: 1つ目は「`typeof null` も `"object"` なので、`null` かもしれない」。2つ目は「`object` 型には `name` があるとは限らない」。`isRecord` のように `null` と配列を除き、`Record<string, unknown>` に絞り込みます。

### 4. any で受け取って、型エラーを消してしまう

`any` にすると型エラーは消えますが、確かめていない値が内側に入り込みます。画面からは正しい値しか送らないつもりでも、API は `curl` などで何でも送れます。

### 5. `as` で型を言い張る

`req.body as RouteInput` と書くと、型エラーは消えます。でも、実際の値は何も変わりません。`as`（型アサーション）は「私は分かっている」とコンパイラを黙らせるだけなので、境界では使いません。

## 練習問題

1. `typeof [] === "object"` と `typeof null === "object"` は、それぞれ `true` と `false` のどちらですか？ それを踏まえて、`isRecord` に `!Array.isArray(value)` が入っている理由を答えてください。
2. 片道運賃に `"220"`（文字列）が送られてきたとき、`parseRouteInput` はどうしますか？ テストのどこで確かめているかも答えてください。
3. `parseRouteInput` の戻り値の型を `RouteInput` にし、誤りがあれば例外を投げる形にした場合と比べて、`Result<RouteInput>` にした利点を1つ挙げてください。

## 理解の確認

> 「型を書いてあるのに、なぜ API の受け口で値を確かめる必要があるのか」を、第1章の「型消去」という言葉を使って説明してください。

## 解答

1. どちらも `true` です。`typeof` だけでは、配列と `null` を普通のオブジェクトと見分けられません。`isRecord` は「名前の付いた項目を持つオブジェクト」だけを通したいので、`null` と配列を除いています。
2. 誤りとして扱い、`oneWayFare` の項目に「片道運賃は0以上の整数（円）で入力してください」を返します。`parse-route-input.test.ts` の「片道運賃は 0〜100000 の整数」の中の `oneWayFare: "220"` で確かめています。文字列から数に勝手に変換しないのは、`"２２０"`（全角）や `"220円"` のような値をどう扱うかを、画面の側で決めるためです。
3. 例: 失敗するかもしれないことが型に表れるので、呼ぶ側が `ok` を確かめないと `value` を使えず、エラーの扱いを忘れると型エラーで気づける。ほかに、誤りを全部まとめて返しやすい、例外を使わないので処理の流れが追いやすい、など。
