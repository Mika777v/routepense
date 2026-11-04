# 第17章 ジェネリクス（型を引数にとる型と関数）

## この章で学ぶこと

1. ジェネリクスの定義と、型引数（`<T>`）が推論されるしくみ
2. 制約（`<K extends ...>`）で、型引数に入れてよい型をしぼる書き方
3. 型引数は実行時には無いこと。`as T` で「言い張る」と型チェックをすり抜けること

## 前提知識

- 第2章（判別可能なユニオン型）、第5章（`keyof`）、第16章（`Promise<T>` と `ApiResult<T>`）
- Java のジェネリクス（`List<T>`・`<T extends Comparable<T>>`）

| | Java | TypeScript |
|---|---|---|
| 書き方 | `class Box<T>`・`<T> T first(List<T> xs)` | `type Box<T> = ...`・`function first<T>(xs: T[]): T` |
| 型引数の推論 | メソッドの呼び出しでは推論される。`new` は `<>`（ダイヤモンド演算子） | 関数の呼び出しで、引数から推論される |
| 制約 | `<T extends Number>` | `<T extends number>`・`<K extends keyof X>` |
| 実行時 | 型消去（`List<String>` も実行時は `List`） | 型はすべて消える（型引数だけでなく、型そのものが JavaScript に残らない） |
| `List<String>` を `List<Object>` に入れる | できない（ワイルドカード `? extends` を使う） | `string[]` は `unknown[]` にそのまま入る（配列は「中身の型が広い方」に入れられる。その代わり、書き込みの誤りは見逃される） |

Java を知っていれば、考え方はほぼ同じです。違いは「型引数を `class` ではなく `type` や関数に付けることが多い」ことと、「実行時に型が何も残らない」ことです。

## 概念の説明

**定義**: ジェネリクス（generics、総称型）とは、**型を引数として受け取る型や関数**のことです。`<T>` の `T` を**型引数**（type parameter、型の仮引数）と呼びます。使うときに `T` に具体的な型が入ります。

**理由**: 「中身の型だけが違う、同じ形のもの」を1つの定義で書くためです。`T` を使わずに `unknown` や `any` で書くと、取り出した値の型が分からなくなり、使う側で毎回確かめるか、型チェックをあきらめることになります。

```ts
// 型のジェネリクス: 中身の型 T を受け取る
type Box<T> = { value: T };

const a: Box<number> = { value: 1 };
const b: Box<string> = { value: "x" };

// 関数のジェネリクス: 引数の型から T が決まり、戻り値の型にも同じ T が使われる
function first<T>(xs: T[]): T | undefined {
  return xs[0];
}

const n = first([1, 2, 3]); // T は number と推論される。n の型は number | undefined
const s = first(["a", "b"]); // T は string。s の型は string | undefined
```

`first([1, 2, 3])` と書くだけで、`T` が `number` に決まります（**型引数の推論**）。`first<number>([1, 2, 3])` と明示もできますが、引数から決まるなら書かないのが普通です。

### 制約（extends）

**定義**: `<T extends 型>` は、「`T` には、その型に当てはまる型しか入れられない」という**制約**です。

**理由**: 関数の中で `T` の値を使うとき、何でも入るなら何もできません。制約を付けると、その型が持つ性質（プロパティなど）を関数の中で使えます。

```ts
// T は length を持つ型に限る。だから関数の中で x.length が使える
function longer<T extends { length: number }>(x: T, y: T): T {
  return x.length >= y.length ? x : y;
}

longer("abc", "de"); // OK。T は string
longer([1, 2], [3]); // OK。T は number[]
// longer(1, 2);     // 型エラー（number は length を持たない）
```

`keyof` と組み合わせた `<K extends keyof X>` は、「`K` は `X` のプロパティ名のどれか」という意味です（第5章）。

### 型引数は実行時に無い

TypeScript の型は、JavaScript に変換するときに全部消えます。`T` が何かを、実行中に調べることはできません。そのため、外から来た値（`fetch` の応答など）を `T` だと決めるのは、**書いた人の約束**でしかありません。`as T`（型アサーション。「この値は T だ」と言い張る書き方）は、その約束を型チェックに押し通します。

```ts
function parse<T>(text: string): T {
  return JSON.parse(text) as T; // 中身を確かめずに T だと言い張る
}

const box = parse<Box<number>>('{"value":"oops"}');
box.value.toFixed(); // 型チェックは通るが、実行すると TypeError（value は文字列）
```

信用できない値は、`as T` ではなく、第4章の型ガードで確かめてから使います。

## このプロジェクトでの実例

### 1. 結果の型: `Result<T>` と `ApiResult<T>`

`backend/src/validation/result.ts`:

```ts
export type Result<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };
```

`frontend/src/api-client.ts`:

```ts
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };
```

成功のときの値の型（ルート・日次記録の一覧など）だけが違い、失敗の形は同じです。`T` で受け取ることで、`Result<Route>`・`Result<DailyRecordInput>` などを1つの定義で表せます。判別可能なユニオン型（第2章）なので、`ok` を見た後は `value` の型が `T` に決まります。

### 2. 型引数を受け渡す関数: `request<T>`

`frontend/src/api-client.ts` の `request` は、応答の本文の型を `T` で受け取り、`Promise<ApiResult<T>>` を返します。`frontend/src/routes/routes-api.ts` は、それを包んで使います。

```ts
function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  return requestUrl<T>(`${BASE}${path}`, init);
}

export function listRoutes(): Promise<ApiResult<Route[]>> {
  return request<Route[]>("");
}
```

`T` は引数（URL の文字列）からは決まりません。この形なら、`return request("")` と書いても、TypeScript は**戻り値の型**（`Promise<ApiResult<Route[]>>`）から `T` を `Route[]` と推論します。それでも `request<Route[]>` と明示しているのは、読む人が「この URL は `Route[]` を返す」と一目で分かるようにするためです。戻り値の型が書かれていない場所で呼ぶと、推論の手がかりが無くなります（次の「間違い1」）。

### 3. `as T` を使っている箇所と、その理由

`request` の中には次の2行があります。

```ts
return { ok: true, value: undefined as T }; // 204（本文の無い成功）
// ...
return { ok: true, value: (await res.json()) as T };
```

`res.json()` の戻り値は `Promise<any>` で、中身が本当に `T` かは確かめていません。backend は同じリポジトリにあり、応答の型を `shared/` で共有しているので、「backend が `T` の形で返す」という約束を信じて `as T` にしています。外部の API（駅すぱあとなど）の応答には、この書き方はしません。backend の `ekispert-route-search.ts` は、応答を `unknown` として受け、形を確かめてから使います（第4章）。

### 4. 制約: `update<K extends keyof BulkFormValues>`

`frontend/src/calendar/BulkDialog.tsx`:

```ts
function update<K extends keyof BulkFormValues>(key: K, value: BulkFormValues[K]) {
  setValues((prev) => ({ ...prev, [key]: value }));
}
```

`K` は `BulkFormValues` の欄の名前（`"startDate"`・`"skipHolidays"` など）のどれかに限られます。`update("skipHolidays", true)` と呼ぶと `K` が `"skipHolidays"` に決まり、2つめの引数の型は `BulkFormValues["skipHolidays"]`、つまり `boolean` になります。1つの関数で、どの欄にも「その欄の型の値」だけを入れられます。`ExtraTripForm.tsx` の `setField`・`RouteForm.tsx` の `setField` も同じ形です。

## よくある間違いと、型エラーの読み方

### 間違い1: 型引数を推論できない関数で、書き忘れる

```ts
// 型エラーの例
const result = await request("/api/routes"); // T を書き忘れた
if (result.ok) {
  console.log(result.value.map((r) => r.name));
}
// error TS18046: 'result.value' is of type 'unknown'.
// error TS7006: Parameter 'r' implicitly has an 'any' type.
```

読み方: 引数からも、受け取る変数の型からも `T` が決まらないので、`T` は `unknown` になりました。`unknown` の値には `.map` を呼べません（第4章）。`request<Route[]>("/api/routes")` と明示します。戻り値の型を書いた関数の `return` の中なら推論されますが、どこで推論され、どこでされないかを覚えるより、型引数を明示する方が読みやすくなります。

### 間違い2: 制約が無いのに、T のプロパティを使う

```ts
// 型エラーの例
function longer<T>(x: T, y: T): T {
  return x.length >= y.length ? x : y;
}
// error TS2339: Property 'length' does not exist on type 'T'.
```

読み方: 制約の無い `T` には何でも入る（`number` も入る）ので、`length` があるとは言えません。`<T extends { length: number }>` と制約を付けます。Java で `<T>` のまま `x.compareTo(y)` を呼べないのと同じです。

### 間違い3: 型引数を実行時に使おうとする

```ts
// 型エラーの例
function isOf<T>(x: unknown): x is T {
  return x instanceof T;
}
// error TS2693: 'T' only refers to a type, but is being used as a value here.
```

読み方: 「`T` は型であって、値ではない」。型は実行時に消えるので、`instanceof` には使えません。Java の型消去で `x instanceof T` が書けないのと同じ理由です。確かめたいなら、形を調べる型ガード（第4章・第13章）を書きます。

## 練習問題

1. 配列の最後の要素を返す `last` を、ジェネリクスで書いてください。`last([1, 2, 3])` の戻り値の型は何になりますか。
2. 次の `pick` の `K` に制約を付けて、`pick(route, "nmae")` が型エラーになるようにしてください。

   ```ts
   function pick<T, K>(obj: T, key: K) {
     return obj[key];
   }
   ```

3. `request` の `(await res.json()) as T` を、駅すぱあとの API の応答にも使わないのはなぜですか。

## 理解の確認

`update<K extends keyof BulkFormValues>(key: K, value: BulkFormValues[K])` を、ジェネリクスを使わずに `update(key: keyof BulkFormValues, value: BulkFormValues[keyof BulkFormValues])` と書くと、`update("skipHolidays", "2026-11-04")` はどうなりますか。それはなぜですか。

## 解答

1.

   ```ts
   function last<T>(xs: T[]): T | undefined {
     return xs[xs.length - 1];
   }
   ```

   戻り値の型は `number | undefined` です（`T` が `number` と推論される）。空の配列なら `undefined` が返るので、`| undefined` を付けます。

2.

   ```ts
   function pick<T, K extends keyof T>(obj: T, key: K): T[K] {
     return obj[key];
   }
   ```

   `K` は `T` のプロパティ名に限られるので、`"nmae"` は型エラーです。戻り値の型 `T[K]` は「そのプロパティの型」で、`pick(route, "oneWayFare")` は `number` になります。

3. `as T` は中身を確かめずに型を言い張るだけで、実行時には何も確かめません。backend の応答は、同じリポジトリの `shared/` の型で形を約束しているので信じられますが、外部の API は仕様の変更や想定外の応答があり得ます。そのため `unknown` で受け、型ガードで形を確かめてから使います。

理解の確認の答え: 型エラーにならずに通ってしまいます。`value` の型が「どれかの欄の型」（`string | boolean | Weekday[] | ...`）になり、`key` との結び付きが失われるからです。ジェネリクスの `K` は、`key` に入れた欄の名前を覚えておき、`value` の型をその欄の型にしぼります。
