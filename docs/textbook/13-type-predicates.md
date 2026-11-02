# 第13章 型の述語（filter で null を除く）

## この章で学ぶこと

1. 型の述語（`x is T`）の定義と、`filter` の結果の型が絞り込まれるしくみ
2. TypeScript が型の述語を推論してくれる場合と、推論できない場合
3. 型の述語は「うそ」をついても型エラーにならないこと

## 前提知識

- 第2章（判別可能なユニオン型と、型の絞り込み）、第4章（型ガード）、第12章（配列のメソッド）
- Java の `stream().filter(Objects::nonNull)`

| | Java | TypeScript |
|---|---|---|
| null を除く | `list.stream().filter(Objects::nonNull)` | `list.filter((x) => x !== null)` |
| 除いた後の型 | `Stream<Day>` のまま（null が入らないことは型に出ない） | `(Day \| null)[]` から `Day[]` に変わる |
| しくみ | — | 型の述語（`x is Day`） |

Java の型には「null が入るかどうか」が無いので、`filter` の前後で型は変わりません。TypeScript（`strict` のとき）は `Day | null` と `Day` を別の型として扱うので、`filter` で null を除いたことを型にも伝える必要があります。

## 概念の説明

**定義**: 型の述語（type predicate）とは、関数の戻り値の型に書く `引数 is 型` のことです。「この関数が `true` を返したら、引数はその型だ」と TypeScript に伝えます。第4章の型ガードを、関数として切り出した形です。

```ts
type Day = { date: string };

function isDay(x: Day | null): x is Day {
  return x !== null;
}

const week: (Day | null)[] = [null, { date: "2026-11-01" }];
const days: Day[] = week.filter(isDay); // Day[] に絞り込まれる
```

**理由**: `filter` には、型の述語を受け取ったときは、結果の配列の型をその型にする、という型の定義があります。ふつうの `boolean` を返す関数では、`true` の要素がどんな型かを TypeScript は知りようがないので、結果の型は元のまま（`(Day | null)[]`）です。

### 推論される型の述語（TypeScript 5.5 から）

TypeScript 5.5 から、関数の中身が単純な絞り込みなら、型の述語を書かなくても推論されます。このプロジェクトの TypeScript（6.0）でも同じです。

```ts
const days: Day[] = week.filter((d) => d !== null); // d is Day と推論される
```

ただし、推論されるのは「`true` なら `Day`、`false` なら `Day` ではない」と言い切れる書き方だけです。

```ts
const days: Day[] = week.filter((d) => Boolean(d)); // 推論されない（型エラーになる例。下の「よくある間違い」）
```

`Boolean(d)` は、`Day` 以外の値（例: `0` や `""`）でも `false` になりうる書き方なので、TypeScript は型を絞り込みません。

## このプロジェクトでの実例

表表示の行は、`frontend/src/calendar/month-table.ts` の `buildTableRows` で作ります（Task #25）。カレンダー用の週の配列には、前後の月の空のマスとして `null` が入っています（`CalendarWeek = (CalendarDay | null)[]`）。

```ts
export function buildTableRows(weeks: readonly CalendarWeek[]): TableRow[] {
  return weeks
    .flat()                         // (CalendarDay | null)[]
    .filter((day) => day !== null)  // CalendarDay[]（型の述語が推論される）
    .map(toTableRow);               // TableRow[]
}
```

- `flat` で週の配列を1列にし、`filter` で `null` を除きます。この時点で型が `CalendarDay[]` になるので、`map(toTableRow)` に渡せます
- 表はカレンダーと同じ `buildCalendar` の結果から作ります。表示を切り替えても、同じ記録・同じ金額が出ます（テストは `month-table.test.ts`）

## よくある間違いと、型エラーの読み方

### 1. 推論されない書き方で null を除く（型エラーになる例）

```ts
const days: Day[] = week.filter((d) => Boolean(d));
// error TS2322: Type '(Day | null)[]' is not assignable to type 'Day[]'.
//   Type 'Day | null' is not assignable to type 'Day'.
//     Type 'null' is not assignable to type 'Day'.
```

下から読むと分かりやすいです。「`null` は `Day` に入らない。だから `Day | null` も `Day` に入らない。だから `(Day | null)[]` は `Day[]` に入らない」。`filter` の結果がまだ `null` を含む型のままだ、という意味です。`(d) => d !== null` と書くか、`(d): d is Day => Boolean(d)` と型の述語を書きます。

### 2. 型の述語でうそをつく（型エラーにならない例）

```ts
const wrong: Day[] = week.filter((d): d is Day => true);
// 型チェックは通る。でも wrong には null が入っていて、wrong[0].date で実行時に落ちる
```

型の述語は、TypeScript が中身を確かめずに信じる約束です（Java のキャスト `(Day) x` に近い）。型の述語を自分で書くときは、本当にその型だけで `true` になるかを確かめます。推論に任せられるなら、任せる方が安全です。

### 3. `.length` で数えるだけなのに、型を気にする

`weeks.flat().filter((day) => day?.status.kind === "unentered").length` のように数を数えるだけなら、結果の型が `(CalendarDay | null)[]` のままでも困りません（`month.ts` の `countUnentered`）。型の述語が要るのは、絞り込んだ要素をその後で使うときです。

## 練習問題

1. 次の `xs` の型は何ですか。`const xs = [1, null, 3].filter((x) => x !== null);`
2. `(string | number)[]` から文字列だけを取り出し、`string[]` にしてください。
3. `const ys = [1, null, 3].filter((x) => x);` の `ys` の型は何ですか。また、`0` が入っていたら何が起きますか。

## 理解の確認

`buildTableRows` で、`filter` の後に `map(toTableRow)` を書けるのはなぜですか。「型の述語」という言葉を使って説明してみてください。

## 解答

1. `number[]` です。`x !== null` から `x is number` が推論されます。
2. 例: `values.filter((v) => typeof v === "string")`。`typeof` による絞り込みも推論されるので、結果は `string[]` になります。
3. `(number | null)[]` です（`x` のような書き方では推論されません）。また、`0` は `false` と見なされるので、`0` の要素も消えてしまいます。null だけを除きたいときは `x !== null` と書きます。
