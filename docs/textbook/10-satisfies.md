# 第10章 satisfies（型を確かめつつ、値の型を残す）

## この章で学ぶこと

1. 型注釈（`const x: T = ...`）と `satisfies`（`const x = ... satisfies T`）の違い
2. `as const` と `satisfies` を組み合わせて、決まった値の一覧を書く方法
3. どちらを使うかの選び方

## 前提知識

- 第4章（`as const` と `typeof`）、第5章（`Record`）
- Java の変数の宣言（`List<Integer> list = List.of(1, 2)`）

| | Java | TypeScript の型注釈 | TypeScript の `satisfies` |
|---|---|---|---|
| 書き方 | `Map<String, List<Integer>> m = ...` | `const m: Record<string, number[]> = ...` | `const m = ... satisfies Record<string, number[]>` |
| 変数の型 | 宣言した型 | 注釈した型（広い型） | 値から決まる型（狭い型） |
| 形が合わないとき | コンパイルエラー | 型エラー | 型エラー |

Java では、変数の型は宣言した型になります。TypeScript の型注釈も同じです。`satisfies` は「この型に合っているかだけを確かめ、変数の型は値のままにする」ための書き方で、Java には当たるものがありません。

## 概念の説明

**定義**: `式 satisfies 型` は、式の値がその型に合っているかを確かめる演算子です。合っていなければ型エラーになります。合っていても、**式の型は変えません**（型注釈と違って、広い型に置き換えません）。

**理由**: 型注釈を付けると、値が持っていた細かい情報（どのキーがあるか、どの値か）が消え、注釈した広い型として扱われます。`satisfies` なら、形の確認と細かい情報の両方を得られます。

```ts
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// 型注釈: 変数の型は Record<string, readonly Weekday[]>（どんなキーでもある、と見なされる）
const A: Record<string, readonly Weekday[]> = { 平日: [1, 2, 3, 4, 5] };
A.週末; // 型エラーにならない。値は undefined

// satisfies: 形を確かめたうえで、変数の型は { readonly 平日: readonly [1, 2, 3, 4, 5] }
const B = { 平日: [1, 2, 3, 4, 5] } as const satisfies Record<string, readonly Weekday[]>;
B.週末; // 型エラー（無いキー）
```

- `as const` で、値を「中身の決まった読み取り専用の値」にします（第4章）
- `satisfies` で、その値が「曜日の配列の一覧」の形に合っているかを確かめます
- 2つを組み合わせると、**書き間違いは型エラーになり、しかも使う側はキーの名前まで分かる**状態になります

## このプロジェクトでの実例

### 曜日をまとめて入れるボタン（`frontend/src/calendar/bulk-form.ts`）

```ts
export const WEEKDAY_PRESETS = {
  平日: [1, 2, 3, 4, 5],
  土日: [6, 0],
  毎日: [1, 2, 3, 4, 5, 6, 0],
} as const satisfies Record<string, readonly Weekday[]>;
```

- 曜日に `7` などを書くと型エラーになります（`Weekday` は 0〜6）
- `initialBulkForm` では `WEEKDAY_PRESETS.平日` と書いて、平日をはじめの値にしています。キーがあることを型が知っているので、`undefined` の心配がありません
- 一括設定ダイアログ（`BulkDialog.tsx`）では、`Object.entries(WEEKDAY_PRESETS)` でボタンを並べます。プリセットを足せば、ボタンも増えます

### 型注釈を使う場所との違い（同じファイル）

`KIND_LABELS`（`BulkDialog.tsx`）は `Record<BulkFormValues["kind"], string>` と型注釈で書いています。キーは「勤務区分の種類の全部」と決まっているので、広い型で十分で、かえって「種類を足したのに表示名を書き忘れた」ときに型エラーで気付けます（第5章）。

## よくある間違いと、型エラーの読み方

### 1. 合わない値を書く（型エラーになる例）

```ts
const C = { 平日: [1, 2, 3, 4, 5, 7] } as const satisfies Record<string, readonly Weekday[]>;
// error TS2322: Type '7' is not assignable to type 'Weekday'.
```

「`7` は `Weekday` に入れられない」という意味です。エラーは `satisfies` の行ではなく、合わない値（`7`）の位置に出ます。

### 2. satisfies の後で、無いキーを読む（型エラーになる例）

```ts
B.週末;
// error TS2339: Property '週末' does not exist on type '{ readonly 平日: readonly [1, 2, 3, 4, 5]; }'.
```

`B` の型は、値から決まった `{ readonly 平日: ... }` です。型注釈の `A` なら同じ行は通ってしまい、実行すると `undefined` になります。

### 3. as const を付けずに、読み取り専用の型を求める

`as const` が無くても `satisfies` は通ります。ただし `P.平日` の型は `(1 | 2 | 3 | 4 | 5)[]`（書き換えられる配列）になり、「この並びで決まっている」という情報（`readonly [1, 2, 3, 4, 5]`）は残りません。`P.平日.push(6)` のように書き換えても、型エラーになりません。一覧として固定したい値には `as const` も付けます。

## 練習問題

1. `const P: Record<string, readonly Weekday[]> = { 平日: [1, 2, 3, 4, 5] };` と書いたとき、`P.平日` の型は何ですか。このプロジェクトの tsconfig（`noUncheckedIndexedAccess` が有効）で答えてください。
2. `WEEKDAY_PRESETS` に `祝日: []` を足すと、型エラーになりますか。
3. 次のうち、`satisfies` が向いているのはどちらですか。（a）ルートの一覧のように、画面で増えたり減ったりする値　（b）プリセットのように、ソースコードに書いて決まる値

## 理解の確認

`WEEKDAY_PRESETS` を型注釈ではなく `satisfies` で書いたのはなぜですか。「キー」という言葉を使って、一言で説明してみてください。

## 解答

1. `readonly Weekday[] | undefined` です。型注釈の型は「どんな文字列のキーでもよい」`Record<string, ...>` なので、`平日` があるかを型は知りません。`noUncheckedIndexedAccess` があるので、`undefined` かもしれないと見なされます。
2. なりません。空の配列も「曜日の配列」の形に合います。押すと曜日のチェックが全部外れるボタンになります（このプロジェクトでは「外す」ボタンを別に置いています）。
3. （b）です。`satisfies` は、ソースコードに書いた値の形を確かめるためのものです。（a）のように実行中に変わる値は、型注釈や、API の受け口での確認（第4章）で扱います。
