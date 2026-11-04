# 第18章 タプル型（長さと並びの決まった配列）

## この章で学ぶこと

1. タプル型の定義と、ふつうの配列の型（`string[]`）との違い
2. `as const` で値からタプル型を作り、マップ型で「同じ長さの別の型」を作る書き方
3. 列の数の間違いを型エラーで見つけるしくみ

## 前提知識

- 第10章（`satisfies` と `as const`）、第17章（ジェネリクス）
- Java の配列（`String[]`）と、record（`record Pair(String a, int b)`）

| | Java | TypeScript |
|---|---|---|
| 長さの決まらない並び | `String[]`・`List<String>` | `string[]` |
| 長さと並びの決まった組 | 専用の型を作る（`record Pair(String a, int b)`） | タプル型 `[string, number]`（名前の無い組） |
| 長さの確認 | 実行時（`ArrayIndexOutOfBoundsException`） | 型チェックのとき（タプルなら） |

Java には、名前の無い「組」の型がありません。TypeScript のタプルは、record を名前無しで、配列の形のまま書いたものと考えると近いです。

## 概念の説明

**定義**: タプル型（tuple type）とは、**要素の数と、それぞれの位置の型が決まった配列の型**です。`[string, number]` は「長さ 2 で、0 番目が `string`、1 番目が `number`」の配列です。

**理由**: CSV の1行や、`Promise.all` の結果（第16章）のように、「位置に意味がある並び」を表すためです。`string[]` だと長さが分からないので、列の足りない行も型チェックを通ってしまいます。

```ts
const pair: [string, number] = ["自宅↔本社", 220];
const name = pair[0]; // string
const fare = pair[1]; // number

const list: string[] = ["a", "b"]; // 何個でもよい
```

### as const で値からタプルを作る

`as const` を付けた配列リテラルは、`readonly` のタプルになり、要素の型は文字列そのもの（リテラル型）になります。

```ts
const HEADER = ["日付", "金額"] as const;
// HEADER の型: readonly ["日付", "金額"]

const loose = ["日付", "金額"];
// loose の型: string[]（長さも中身も忘れる）
```

### マップ型で「同じ長さの別の型」を作る

**定義**: マップ型（mapped type）とは、`{ [K in keyof T]: ... }` の形で、**ある型の各プロパティ（要素）を、別の型に置き換えた型**を作る書き方です。`T` が型引数（第17章）でタプルのときは、結果もタプルになります。

```ts
type AllString<T extends readonly unknown[]> = { -readonly [K in keyof T]: string };

type Row = AllString<typeof HEADER>; // [string, string]（見出しと同じ長さ）

const ok: Row = ["2026-11-04", "440"];
```

`-readonly` は「`readonly` を外す」という意味です。見出しの `as const` から付いてきた `readonly` を、行の型には持ち込まないために外しています（行はふつうの配列として作って渡すため）。

## このプロジェクトでの実例

`shared/src/csv.ts`（要件定義 F7 の CSV 出力）:

```ts
export const CSV_HEADER = ["日付", "曜日", "祝日", /* … 13列 … */ "目的"] as const;

type AllString<T extends readonly unknown[]> = { -readonly [K in keyof T]: string };

export type CsvRow = AllString<typeof CSV_HEADER>;
```

`CsvRow` は「見出しと同じ 13 個の `string` のタプル」です。見出しに列を足すと、`CsvRow` も 14 個に変わり、行を作る `recordRows` の中で列の足りない箇所が型エラーになります。見出しと行の列の数が、1か所（`CSV_HEADER`）から決まります。

その日の共通の4列は、長さ 4 のタプルで返しています。

```ts
function dayColumns(date: DateString, kind: WorkStyleKind): [string, string, string, string] {
  return [date, WEEKDAY_LABELS[weekdayOf(date)], holidayName(date) ?? "", WORK_STYLE_LABELS[kind]];
}

rows.push([...day, "通常", route.from, /* … 残りの 9 列 … */]);
```

タプルをスプレッド（`...day`）すると、長さ 4 が引き継がれるので、残りの 9 列と合わせて 13 列かどうかを型チェックで確かめられます。戻り値の型を `string[]` にすると、長さが分からなくなり、この確認ができません。

## よくある間違いと、型エラーの読み方

### 間違い1: 列が足りない

```ts
// 型エラーの例
const row: CsvRow = ["2026-11-04", "水"];
// error TS2322: Type '[string, string]' is not assignable to type '[string, string, string, …(13個)]'.
//   Source has 2 element(s) but target requires 13.
```

読み方: 「入れた値（source）は 2 個、入れ先（target）は 13 個が必要」。そのまま、足りない列を足します。

### 間違い2: マップ型を型引数を通さずに書く

この章の `AllString` を作る前に、最初は次のように書いて型エラーになりました。

```ts
// 型エラーの例
export type CsvRow = { [K in keyof typeof CSV_HEADER]: string };

rows.push([...day, "通常", /* … */]);
// error TS2345: Argument of type '[string, string, …]' is not assignable to parameter of type 'CsvRow'.
```

読み方: 13 個の `string` のタプルが、`CsvRow` に入らないと言っています。マップ型がタプルのまま残るのは、`keyof T` の `T` が**型引数**のときだけです。`typeof CSV_HEADER` を直接書くと、配列のメソッド（`map`・`length` など）まで全部 `string` に置き換えたオブジェクトの型になり、タプルではなくなります（そのため `row.map(...)` も `This expression is not callable` になりました）。`AllString<T>` のように型引数を通します。

### 間違い3: `as const` を付け忘れる

```ts
const HEADER = ["日付", "金額"]; // as const が無い
type Row = AllString<typeof HEADER>; // string[]（長さが分からない）
const row: Row = ["2026-11-04"]; // 型エラーにならない
```

型エラーが出ないのが間違いです。`HEADER` が `string[]` なので、`Row` も `string[]` になり、列の数を確かめられません。

## 練習問題

1. `const point = [1, 2] as const;` の型は何ですか。`point[2]` と書くと、どうなりますか。
2. `AllString` を参考に、タプルの各要素を `number` にした `AllNumber<T>` を書き、`AllNumber<readonly ["a", "b", "c"]>` が何になるか答えてください。
3. `dayColumns` の戻り値の型を `string[]` に変えると、`rows.push([...day, …])` はどうなりますか。

## 理解の確認

`CSV_HEADER` に `"メモ2"` を足したとき、ほかに直さなければいけない場所はどこで、それにはどうやって気づけますか。

## 解答

1. 型は `readonly [1, 2]` です。`point[2]` は型エラーになります（`Tuple type 'readonly [1, 2]' of length '2' has no element at index '2'.`）。長さ 2 のタプルに 2 番目（0 から数えて3つめ）は無いからです。

2.

   ```ts
   type AllNumber<T extends readonly unknown[]> = { -readonly [K in keyof T]: number };
   type N = AllNumber<readonly ["a", "b", "c"]>; // [number, number, number]
   ```

3. `[...day, …]` の型が `[...string[], string, …]`（先頭の長さが分からない配列）になり、13 個のタプル `CsvRow` に入らないので型エラーになります（`Target requires 13 element(s) but source may have fewer.`。「少ないかもしれない」と言っている）。長さの確認が必要な場所では、タプルの型を使い続けます。

理解の確認の答え: `recordRows` の中の、行を作る2か所（通常の行と追加の行）です。`CsvRow` が 14 個のタプルに変わるので、13 個しか並べていない2か所が型エラー（`Source has 13 element(s) but target requires 14.`）になって気づけます。テスト（`csv.test.ts`）の期待する値も直します。
