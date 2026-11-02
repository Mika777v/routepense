# 第12章 配列を1つの値にまとめる（reduce）

## この章で学ぶこと

1. `reduce` の定義と、最初の値（初期値）を必ず渡す理由
2. 最初の値から、まとめた値（アキュムレータ）の型が決まること
3. 合計と内訳のように、いくつかの値を一度にまとめる書き方

## 前提知識

- 第6章（純粋関数とテスト）、第8章（`map` で配列から配列を作る）
- Java の Stream API（`mapToInt(...).sum()`・`reduce`）

| | Java | TypeScript |
|---|---|---|
| 数の合計 | `trips.stream().mapToInt(Trip::fare).sum()` | `trips.reduce((sum, t) => sum + t.fare, 0)` |
| 汎用のまとめ | `stream.reduce(0, (sum, t) -> sum + t.fare(), Integer::sum)` | `reduce(関数, 最初の値)` |
| 最初の値が無いとき | `reduce(BinaryOperator)` は `Optional<T>` を返す | 空の配列で実行時エラー（`TypeError`） |

Java の `reduce` は、型の違う値にまとめるときに3つ目の引数（並列のときの合わせ方）が要ります。TypeScript の `reduce` は並列で動かないので、関数と最初の値の2つだけです。

## 概念の説明

**定義**: `reduce` は、配列の要素を先頭から1つずつ見て、**1つの値にまとめる**メソッドです。まとめている途中の値をアキュムレータ（accumulator。ため込む入れ物）と呼びます。

```ts
const fares = [440, 160, 320];
const total = fares.reduce((sum, fare) => sum + fare, 0);
// 1回目: sum = 0,   fare = 440 → 440
// 2回目: sum = 440, fare = 160 → 600
// 3回目: sum = 600, fare = 320 → 920
console.log(total); // 920
```

1つ目の引数は「今までのまとめ（`sum`）と次の要素（`fare`）から、新しいまとめを返す関数」です。2つ目の引数 `0` が最初の値です。

**理由**: `for` 文で変数を書き換えても同じ結果になります。`reduce` を使うと、「配列 → 1つの値」という形が1つの式で書け、途中で書き換える変数が無くなります。関数の外の状態を変えないので、純粋関数（第6章）のまま集計できます。

### 最初の値を必ず渡す

最初の値を省くと、配列の先頭の要素が最初の値になります。このため、

- 空の配列では、最初の値が無く、実行時に `TypeError: Reduce of empty array with no initial value` になります。型チェックでは見つかりません
- 要素と違う型（例: `Trip[]` から `number`）にまとめられません

記録の無い月もあるので、このプロジェクトでは必ず最初の値を渡します。

### 最初の値がまとめの型を決める

TypeScript は、最初の値の型から、アキュムレータの型を推論します。`0` なら `number`、`{ total: 0, count: 0 }` なら `{ total: number; count: number }` です。いくつかの値を一度にまとめたいときは、オブジェクトを最初の値にします。

```ts
type Trip = { fare: number };
const trips: Trip[] = [{ fare: 160 }, { fare: 320 }];

const summary = trips.reduce(
  (acc, trip) => ({ total: acc.total + trip.fare, count: acc.count + 1 }),
  { total: 0, count: 0 },
);
console.log(summary); // { total: 480, count: 2 }
```

## このプロジェクトでの実例

月の交通費の合計は `shared/src/fare.ts` の `monthlyFare` で計算します（Task #26）。

```ts
export function monthlyFare(
  records: readonly Pick<DailyRecord, "workStyle" | "extraTrips">[],
): MonthlyFare {
  const sums = records.reduce(
    (acc, record) => ({
      total: acc.total + dailyFare(record),
      workStyleTotal: acc.workStyleTotal + workStyleFare(record.workStyle),
    }),
    { total: 0, workStyleTotal: 0 },
  );
  return { ...sums, extraTotal: sums.total - sums.workStyleTotal };
}
```

- 最初の値 `{ total: 0, workStyleTotal: 0 }` で、記録の無い月でも 0 円を返します
- 合計は1日の交通費 `dailyFare` を足したものにしています。カレンダーの各日に出している金額と同じ関数を使うので、各日の金額を足すと必ず月の合計になります
- 追加の移動の合計は、合計から通常の交通費を引いて出します。足し方を2通り書かないので、内訳を足すと必ず合計に戻ります

1日の交通費（`dailyFare`）の中でも、追加の移動の金額を `reduce` で足しています。

```ts
const extra = record.extraTrips.reduce((sum, trip) => sum + extraTripFare(trip), 0);
```

画面（`frontend/src/calendar/MonthTotal.tsx`）は計算をせず、`monthlyFare` の結果を表示するだけです。テストは React を使わずに `shared/src/fare.test.ts` で書けます。

## よくある間違いと、型エラーの読み方

### 1. 最初の値を忘れて、要素と違う型にまとめる（型エラーになる例）

```ts
const total = trips.reduce((sum, t) => sum + t.fare);
// error TS2365: Operator '+' cannot be applied to types 'Trip' and 'number'.
```

最初の値が無いので、`sum` は配列の先頭の要素、つまり `Trip` になります。エラーの文は「`Trip` と `number` に `+` は使えない」という意味です。最初の値 `0` を渡すと直ります。

### 2. 最初の値を `{}` にする（型エラーになる例）

```ts
const summary = trips.reduce((acc, t) => ({ count: acc.count + 1 }), {});
// error TS2339: Property 'count' does not exist on type '{}'.
```

最初の値 `{}` から、アキュムレータの型が「項目の無いオブジェクト」（`{}`）になります。「`{}` という型に `count` は無い」という意味です。最初の値に `{ count: 0 }` と項目を書くか、`reduce<{ count: number }>(...)` と型を指定します。

### 3. 数の配列で最初の値を省く（型エラーにならず、実行時に落ちる）

```ts
const fares: number[] = [];
const total = fares.reduce((sum, fare) => sum + fare);
// 型チェックは通るが、実行すると TypeError: Reduce of empty array with no initial value
```

要素もまとめも `number` なので、型の上では問題がありません。空の配列が来たときに初めて落ちます。最初の値を書く習慣にすると防げます。

## 練習問題

1. `[220, 160].reduce((sum, fare) => sum + fare * 2, 0)` の値はいくつですか。
2. 日次記録の配列 `records` から、出勤（`workStyle.kind === "commute"`）の日の数を `reduce` で数えてください。
3. `monthlyFare` で、追加の移動の合計を `extraTripFare` で直接足さず、合計との差で出しているのはなぜですか。

## 理解の確認

`reduce` に最初の値を渡すと、何が2つ良くなりますか。「空の配列」と「型」という言葉を使って説明してみてください。

## 解答

1. `760` です。`0 + 220 × 2 = 440`、`440 + 160 × 2 = 760` と進みます。
2. 例:
   ```ts
   const commuteDays = records.reduce(
     (count, record) => (record.workStyle.kind === "commute" ? count + 1 : count),
     0,
   );
   ```
   `records.filter((r) => r.workStyle.kind === "commute").length` でも同じです。数えるだけなら、こちらの方が読みやすいこともあります。
3. 足し方を2通り書くと、片方だけを直したときに「内訳を足しても合計にならない」ずれが起きえます。差で出すと、内訳の和は必ず合計と同じになります。
