# 第1章 tsconfig と型チェック

## この章で学ぶこと

1. TypeScript の「型チェック」が、いつ・何をしているのか
2. `tsconfig.json` で、型チェックの厳しさを決める方法
3. このプロジェクトで `npm run typecheck` が何をしているか

## 前提知識

- JavaScript の基本的な書き方（変数・関数・`import`）
- Java の経験があれば、`javac` のコンパイルエラーを思い浮かべると近い

| | Java | TypeScript |
|---|---|---|
| 型を確かめる道具 | `javac`（コンパイラ） | `tsc`（TypeScript コンパイラ） |
| 型エラーがあるとき | クラスファイルが作られず、実行できない | 型チェックは失敗するが、**JavaScript としては動かせてしまう**（設定による） |
| 実行するもの | JVM がクラスファイルを実行 | Node.js やブラウザが JavaScript を実行。型の情報は消える |
| 設定 | `pom.xml` / `build.gradle` のコンパイラ設定 | `tsconfig.json` |

## 概念の説明

### 型チェックとは

**定義**: 型チェックとは、プログラムを実行する前に、値の使い方が型の宣言と合っているかを確かめることです。

**理由**: 実行してから「`undefined` のプロパティは読めない」と落ちるより、書いた時点で気づけるほうが直すのが楽だからです。

TypeScript の型は、**実行するときには消えます**。これを **型消去**（type erasure: 型の情報を取り除いて JavaScript にすること）と呼びます。
そのため、型が守られているかは「実行する前に `tsc` で確かめる」しかありません。

```ts
// 正しい例
function double(n: number): number {
  return n * 2;
}
double(21); // 42
```

```ts
// 型エラーの例（わざと間違えています）
double("21");
// error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

### tsconfig.json とは

**定義**: `tsconfig.json` は、`tsc` に「どのファイルを」「どのくらい厳しく」確かめるかを伝える設定ファイルです。

よく使う項目:

| 項目 | 意味 |
|---|---|
| `strict` | 厳しいチェックをまとめて有効にする。`null` かもしれない値をそのまま使うとエラーになる、など |
| `noEmit` | 型チェックだけをして、JavaScript のファイルは作らない |
| `include` | 確かめるファイルの範囲 |
| `extends` | ほかの tsconfig の設定を引き継ぐ（Java のクラスの継承のように、共通の設定を親に置く） |
| `types` | 読み込む型定義（`node` なら Node.js の `process` などの型） |

## このプロジェクトでの実例

### 共通の設定を親に置く

`tsconfig.base.json` に共通の設定を置き、`shared`・`backend`・`frontend` の各 `tsconfig.json` が `extends` で引き継ぎます。

```jsonc
// tsconfig.base.json（抜粋）
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true, // 配列の要素を取り出すと「undefined かもしれない」として扱う
    "noEmit": true,                   // 型チェックだけ。実行は tsx と Vite に任せる
    "types": []                       // 型定義は各パッケージで必要なものだけ指定する
  }
}
```

```jsonc
// backend/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "types": ["node"] }, // backend だけ Node.js の型を使う
  "include": ["src"]
}
```

frontend だけは画面を扱うので、`lib` に `DOM`（`document` などブラウザの型）を足しています（`frontend/tsconfig.json`）。

### 型チェックと実行が別になっている

| すること | 使う道具 | 型を確かめるか |
|---|---|---|
| backend を動かす | `tsx`（`npm run dev -w backend`） | 確かめない。型を消してすぐ実行する |
| frontend を動かす | Vite（`npm run dev -w frontend`） | 確かめない。型を消してブラウザに渡す |
| 型を確かめる | `tsc`（`npm run typecheck`） | 確かめる |

動かす道具が型を確かめないのは、毎回の起動を速くするためです。そのかわり、PR を出す前と CI で `npm run typecheck` を必ず実行します（`.github/workflows/ci.yml`）。

### フロントとバックで同じ型を使う

`shared/src/index.ts` の `HealthResponse` を、backend（`backend/src/app.ts`）と frontend（`frontend/src/App.tsx`）の両方が `import` しています。

```ts
// shared/src/index.ts
export type HealthResponse = {
  status: "ok";
  time: string;
};
```

```ts
// backend/src/app.ts（抜粋）
const body: HealthResponse = { status: "ok", time: new Date().toISOString() };
res.json(body);
```

backend で `status: "OK"`（大文字）と書き間違えると、`tsc` がエラーにします。応答の形を変えたいときは `shared` の型を直せば、使っている側のずれもエラーとして見つかります。

## よくある間違いと、型エラーの読み方

### 1. 「動いたから大丈夫」と思ってしまう

`npm run dev` は型を確かめないので、型エラーがあっても画面は動くことがあります。**動くことと、型が正しいことは別**です。PR の前に `npm run typecheck` を実行します。

### 2. `process` や `document` が見つからない

```text
error TS2591: Cannot find name 'process'. Do you need to install type definitions for node?
```

読み方: 「`process` という名前を知らない。Node.js の型定義が要るのでは？」という意味です。
その tsconfig の `types` に `node` が入っていないのが原因です。frontend で `document` が見つからない場合は、`lib` に `DOM` が無いのが原因です。

### 3. 型エラーのメッセージの読み方

```text
src/app.ts:10:9 - error TS2322: Type '"OK"' is not assignable to type '"ok"'.
```

| 部分 | 意味 |
|---|---|
| `src/app.ts:10:9` | ファイル名:行:列（CI のログなど、色の付かない出力では `src/app.ts(10,9)` の形になる） |
| `TS2322` | エラーの番号。検索すると説明が見つかる |
| `Type 'A' is not assignable to type 'B'` | 「A の値を、B の型の場所には入れられない」。左が実際の値、右が求められている型 |

## 練習問題

1. `tsconfig.base.json` の `"strict": true` を消すと、どんなチェックが行われなくなりますか？ 1つ挙げてください。
2. `backend/src/app.ts` で `time: new Date()`（`toISOString()` を付けない）と書くと、`npm run typecheck` はどんなエラーを出しますか？ 予想してから実際に試してください（試した後は元に戻してください）。
3. `tsx` で backend を動かすとき、型エラーがあっても起動できるのはなぜですか？

## 理解の確認

> 「CI で `npm run typecheck` を実行しないと、どんな問題が起こりうるか」を、この章の言葉（型消去・実行の道具）を使って説明してください。

## 解答

1. 例: `null` や `undefined` かもしれない値を、確かめずに使ってもエラーにならなくなる（`strictNullChecks`）。ほかに、型を書いていない引数が何でも入る型（`any`）として扱われる（`noImplicitAny`）、など。
2. `Type 'Date' is not assignable to type 'string'.`（TS2322）。`HealthResponse` の `time` は `string` なのに、`Date` の値を入れようとしているためです。
3. `tsx` は型を確かめず、型の部分を取り除いて（型消去して）そのまま JavaScript として実行するためです。型が正しいかは `tsc` でしか確かめられません。
