# 第7章 型から型を作る（Pick・Omit と交差型）

## この章で学ぶこと

1. `Pick` と `Omit` で、ある型から一部のプロパティだけを持つ型を作る方法
2. 交差型（`&`）で、2つの型を合わせる方法
3. 「元の型」を1つにして、そこから型を作ると、何がうれしいか

## 前提知識

- 第2章（ユニオン型）、第3章（構造的型付け）、第5章（`keyof` と `Record`）
- Java の DTO（データを運ぶためだけのクラス）と、継承（`extends`）

| | Java | TypeScript |
|---|---|---|
| 一部の項目だけを持つ型 | 新しい DTO クラスを書き、項目を書き写す | `Pick<Route, "name" \| "from">` で、元の型から作る |
| 一部の項目を除いた型 | 同じく、新しいクラスを書く | `Omit<Route, "id">` |
| 2つの型を合わせる | 継承（`extends`）やインターフェースの多重実装 | 交差型 `A & B` |
| 元の型に項目を足したとき | DTO も手で直す（忘れるとずれる） | `Pick`・`Omit` で作った型も、自動でついてくる |

## 概念の説明

### ユーティリティ型

**定義**: ユーティリティ型（utility type）とは、TypeScript に最初から用意されている「型を受け取って、新しい型を返す」道具です。ジェネリクスのように `<>` に型を渡して使います。

- `Pick<T, K>`: 型 `T` から、名前が `K` のプロパティだけを**選んだ**型
- `Omit<T, K>`: 型 `T` から、名前が `K` のプロパティを**除いた**型
- `Partial<T>`: 型 `T` のプロパティを全部、任意（`?`）にした型

```ts
type Route = { id: string; name: string; oneWayFare: number };

type RouteName = Pick<Route, "name">; // { name: string }
type NewRoute = Omit<Route, "id">; // { name: string; oneWayFare: number }
type RoutePatch = Partial<Route>; // { id?: string; name?: string; oneWayFare?: number }
```

`K` には、`T` のプロパティ名（`keyof T`、第5章）を `|` でつないで渡します。

**理由**: 同じ項目を何度も書き写すと、元の型に項目を足したときに、写した側を直し忘れます。元の型を1つにして、そこから作れば、ずれが起きません。

### 交差型

**定義**: 交差型（intersection type）`A & B` とは、「`A` のプロパティも `B` のプロパティも全部持つ」型です。

```ts
type Named = { name: string };
type Priced = { oneWayFare: number };

type NamedAndPriced = Named & Priced; // { name: string; oneWayFare: number }

const r: NamedAndPriced = { name: "自宅↔本社", oneWayFare: 220 };
```

ユニオン型（`A | B`、第2章）は「`A` か `B` のどちらか」、交差型は「`A` でもあり `B` でもある」です。記号が似ているので、取り違えに気をつけます。

### Omit と & で、1つの項目だけを差し替える

`Omit` で項目を除いてから、`&` で別の型の項目を付け直すと、「ほとんど同じで、1つだけ違う型」を作れます。

```ts
type Route = { id: string; name: string; oneWayFare: number };

// oneWayFare だけを、画面の欄の文字列に差し替える
type RouteForm = Omit<Route, "oneWayFare"> & { oneWayFare: string };
```

## このプロジェクトでの実例

### 入力の型は、元の型から id を除いて作る（`shared/src/route.ts`・`extra-trip.ts`）

```ts
/** ルートを登録・編集するときに送る値（id と userId はサーバーが決める） */
export type RouteInput = Omit<Route, "id" | "userId">;

/** 追加の移動を足す・直すときに送る値（id はサーバーが決める） */
export type ExtraTripInput = Omit<ExtraTrip, "id">;
```

`Route` に項目を足すと、`RouteInput` にも自動で加わります。すると、`parseRouteInput` で新しい項目を確かめていない箇所が型エラーになり、直し忘れに気づけます。

### 記録の時点のコピーは、元の型から選んで作る（`shared/src/route.ts`）

```ts
export type RouteSnapshot = Pick<Route, "name" | "from" | "to" | "transport" | "oneWayFare">;
```

`id` と `userId` は記録の側には要らないので、選びません。

### 関数の引数は、使う項目だけにする（`shared/src/bulk.ts`・`fare.ts`）

```ts
export function bulkTargetDates(
  input: Pick<BulkInput, "startDate" | "endDate" | "weekdays">,
): DateString[] { /* ... */ }

export function dailyFare(record: Pick<DailyRecord, "workStyle" | "extraTrips">): number { /* ... */ }
```

`dailyFare` は `DailyRecord` を丸ごと受け取らず、計算に使う2つだけを受け取ります。そのため、まだ `id` が決まっていない下書き（`DailyRecordDraft`）の交通費も、同じ関数で計算できます。構造的型付け（第3章）なので、`DailyRecord` を渡しても型エラーにはなりません。

### 1つの項目だけを差し替える（`shared/src/bulk.ts`）

```ts
export type BulkPreviewRequest = Omit<BulkInput, "workStyle"> & { workStyle: WorkStyleInput };
```

一括設定の下見の API（`POST /api/daily-records/bulk/preview`）の本文です。期間と曜日は `BulkInput` と同じですが、勤務区分だけが違います。画面は出勤のとき `routeId` しか送らず（`WorkStyleInput`）、ルートの値はサーバーが登録済みのルートからコピーするからです。

## よくある間違いと、型エラーの読み方

### 1. Pick に、無いプロパティの名前を書く（型エラーになる例）

```ts
type R = Pick<Route, "fare">; // 型エラー（わざと間違えています）
```

```
Type '"fare"' does not satisfy the constraint 'keyof Route'.
```

「`"fare"` は `Route` のプロパティ名（`keyof Route`）のどれでもない」という意味です。`Pick` は名前を確かめてくれます。

### 2. Omit は、無いプロパティの名前でも通ってしまう

```ts
type R = Omit<Route, "fare">; // 型エラーにならない。何も除かれず、Route と同じ型になる
```

`Omit` の `K` は、`keyof T` に限られていません。名前を打ち間違えると、除いたつもりの項目が残ります。名前を変えたときなどは、`Omit` を使っている箇所も見直します。

### 3. & で、同じ名前の項目の型をぶつける

```ts
type Bad = BulkInput & { workStyle: WorkStyleInput };
```

これは型エラーにはなりませんが、`workStyle` は「`WorkStyle` でもあり `WorkStyleInput` でもある」型になります。出勤の形では `route` が必須になってしまい、`{ kind: "commute", routeId: "r1" }` を代入すると型エラーになります。差し替えるときは、先に `Omit` で除いてから `&` で付け直します。

## 練習問題

1. `Route` に `memo: string` の項目を足したとします。`RouteInput` と `RouteSnapshot` のうち、自動で `memo` を持つようになるのはどちらですか。理由も答えてください。
2. `DailyRecord` から `id` と `userId` を除いた型を、`Omit` を使って書いてください。また、それは `DailyRecordDraft` と同じ型ですか。
3. 次の型 `T` に、`{ a: "x" }` を代入できますか。
   ```ts
   type T = { a: string } & { b: number };
   ```

## 理解の確認

`RouteInput` を、`Route` の項目を書き写した新しい型にせず、`Omit<Route, "id" | "userId">` にしたのはなぜですか。「項目を足したとき」という言葉を使って、一言で説明してみてください。

## 解答

1. `RouteInput` です。`Omit` は「`id` と `userId` 以外の全部」なので、新しい項目もそのまま入ります。`RouteSnapshot` は `Pick` で名前を1つずつ選んでいるので、`memo` を選び足さない限り入りません。
2. `type T = Omit<DailyRecord, "id" | "userId">;` です。残るのは `date`・`workStyle`・`extraTrips` の3つなので、`DailyRecordDraft`（`Pick<DailyRecord, "date" | "workStyle" | "extraTrips">`）と同じ形になります。構造的型付けなので、同じ形なら同じ型として扱われます。
3. 代入できません。`T` は `a` も `b` も持つ型なので、`Type '{ a: string; }' is not assignable to type 'T'.` という型エラーになります。続く行に、`b` が足りないこと（`Property 'b' is missing ...`）が示されます。
