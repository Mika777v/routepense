# 第19章 「見つからないかもしれない」値の受け取り方（Map.get・find・添字）

## この章で学ぶこと

1. `Map.get`・`Array#find`・配列の添字の戻り値が、どれも `T | undefined` になる理由
2. 使う前に調べる書き方と、関数の呼び出し結果は絞り込めないこと
3. 見つからないときに `undefined` を返すか `throw` するかの選び方

## 前提知識

- 第1章（`noUncheckedIndexedAccess`）、第2章（型の絞り込み）、第11章（`undefined`）、第14章（`Map`）
- Java の `null` と `Optional<T>`

この章は新しい文法ではなく、第1・11・14章に分かれていた話を、**1つの考え方**にまとめ直したものです。

| 引き方 | 見つからない（無い）とき | 戻り値の型 |
|---|---|---|
| `map.get(key)` | `undefined` | `V \| undefined` |
| `array.find((x) => ...)` | `undefined` | `T \| undefined` |
| `array[i]`・`record[key]`（`noUncheckedIndexedAccess` が ON） | `undefined` | `T \| undefined` |

## 概念の説明

**定義**: 「探して、あれば値を、無ければ `undefined` を返す」操作の戻り値は、**かならず `T | undefined`** になります。これは3つの引き方に共通の約束です。

**理由**: 何が入っているか（どのキーがあるか、条件に合う要素があるか、配列が何個あるか）は、実行するまで分かりません。型チェックは実行前に行うので、「無いかもしれない」を型に残すしかありません。Java の `Map#get` は `null` を返しても型には出ませんが、TypeScript は型に出して、確かめずに使うとコンパイルで止めます。

`undefined` の出どころは、**引数ではなく、探す関数の戻り値**です。`fares.get(a)` の `a` が `undefined` なのではなく、`get` が「無かった」と答えたときに `undefined` が出ます。

```ts
const fares = new Map<string, number>([["新宿-渋谷", 200]]);

const f = fares.get("新宿-渋谷"); // number | undefined
```

### 使う前に調べる

調べ方は第11章と同じです。`if` で `undefined` を除くと、その中では `T` に絞り込まれます。

```ts
const f = fares.get("新宿-渋谷");
if (f !== undefined) {
  console.log(f + 1); // f は number
}
```

### 関数の呼び出し結果は絞り込めない

型の絞り込みができるのは、**変数**（と、その変数のプロパティ）だけです。`fares.get(k)` のような**呼び出し**は、書くたびに別の呼び出しとして扱われます。型チェックは「2回目の `get` も同じ値を返す」とは考えません。

```ts
// 型エラーになる例
if (fares.get("新宿-渋谷") !== undefined) {
  const x: number = fares.get("新宿-渋谷"); // 2回目は number | undefined のまま
}
```

```
error TS2322: Type 'number | undefined' is not assignable to type 'number'.
```

直し方は、**先に変数へ入れてから調べる**ことです。

```ts
const f = fares.get("新宿-渋谷");
if (f !== undefined) {
  const x: number = f; // OK
}
```

### 調べないで使うと、どうなるか（型と実行時を分けて考える）

型チェックは、どちらの場合も**書いた時点で**止めます。仮に止めなかったとすると、実行時の結果は次のように違います。

| 式 | 実行時の結果 | 落ちるか |
|---|---|---|
| `200 + undefined` | `NaN`（数ではない値） | 落ちない。`NaN` が後ろの計算へ流れる |
| `undefined.fare` | `TypeError`（`undefined` のプロパティは読めない） | 落ちる |

`NaN` は気づきにくいのが怖いところです。合計が `NaN` になっても、その場ではエラーになりません。だから、型で先に止めることに意味があります。

## 見つからないときの選び方（undefined か throw か）

見つからなかったときの対応は2通りあります。

- **`undefined` を返す**: 見つからないのが**普通にありうる**とき。戻り値の型を `T | undefined` にして、呼ぶ側に「無い場合」を書かせる（例: 祝日でない日の `holidayName`）
- **`throw` する**: 見つからないのが**あってはいけない**とき（呼ぶ側の前提が崩れている、DB の食い違いなど）。早く、原因の近くで気づける

`throw` は値を返さないので、`throw` する関数でも**戻り値の型は `T` のまま**です。

```ts
function fareOf(routes: Route[], routeId: string): number {
  const found = routes.find((r) => r.id === routeId);
  if (found === undefined) {
    throw new Error(`経路が見つかりません: ${routeId}`);
  }
  return found.fare; // ここでは found は Route
}
```

「見つからないとき、黙って飛ばす」は、たいてい悪い選びです。たとえば運賃の合計で、運賃が無いキーを飛ばすと、合計が小さく出るだけで誰も気づけません。経費の申請が少ないまま通ってしまいます。

**戻り値の型だけを `number | undefined` に変えても、エラーの行は消えません。** `found.fare` は `found` が `undefined` かもしれないことを咎めているので、直すのは `found` を使う前の側です。

## このプロジェクトでの実例

- `shared/src/holidays.ts` の `holidayName`: 祝日でないのは普通なので、`string | undefined` を返し、呼ぶ側が分岐します（第14章）
- `frontend/src/calendar/month.ts` の `buildCalendar`: `const holiday = holidayName(date)` と**変数に入れてから** `holiday !== undefined` で調べています。呼び出しを2回書かない形です。また、日付から記録を引く `Map` の `get` の結果を、`recorded` か `unentered`（未入力）かの分岐に使います。「無い」を `{ kind: "unentered" }` という**名前のある状態**にしているので、`undefined` が画面まで漏れません（第2章）

## よくある間違いと、型エラーの読み方

### 1. `get` の結果を、調べずに足し算する（型エラーになる例）

```ts
const total = fares.get("a") + fares.get("b");
```

```
error TS2532: Object is possibly 'undefined'.
```

「オブジェクト（ここでは `get(...)` の結果）が `undefined` かもしれない」という意味です。左と右の2か所に出ます。場所は引数ではなく、`get` の戻り値です（TypeScript のバージョンによって文言は少し違います）。

### 2. 呼び出しを2回書いて絞り込んだつもりになる

上の「関数の呼び出し結果は絞り込めない」を参照してください。変数に入れて直します。

### 3. 戻り値の型を変えて、エラーを消そうとする

`find` の結果を使う関数で、戻り値の型を `number | undefined` に書き換えても、`found.fare` の行のエラーは残ります。`found` を先に調べます。

### 4. 型を言い切って黙らせる（`!` と `as`）

`fares.get(k)!` や `fares.get(k) as number` は、型エラーを消します。ただし、キーが無かったときは `undefined` が流れて、実行時に `NaN` か `TypeError` になります。うそをついても止まらないので、この形は使いません。

## 練習問題

1. 次の `total` は型チェックを通りません。どの式が、どんな型で、なぜですか。直したコードも書いてください。

   ```ts
   const fares = new Map<string, number>([["新宿-渋谷", 200]]);
   function total(keys: string[]): number {
     let sum = 0;
     for (const k of keys) {
       sum += fares.get(k);
     }
     return sum;
   }
   ```

2. `names: string[]` のとき、`names[10]` の型は何ですか（`noUncheckedIndexedAccess` が ON）。なぜ長さを数えて `string` にしてくれないのですか。
3. 次のうち、`undefined` を返す形が合うものと、`throw` が合うものを選んでください。
   (a) 日付から祝日名を引く (b) 画面で選んだ経路 ID から経路を引く (c) 入力欄の文字から駅名を探す（補完候補）

## 理解の確認

`Map.get` の結果に対して `if (fares.get(k) !== undefined) { sum += fares.get(k); }` と書くと、型エラーが残ります。どの行で、なぜですか。

## 解答

1. `fares.get(k)` です。型は `number | undefined` で、キーが無ければ `undefined`（実行すると `sum` が `NaN` になる）ためです。直し方:

   ```ts
   for (const k of keys) {
     const fare = fares.get(k);
     if (fare === undefined) {
       throw new Error(`運賃がありません: ${k}`);
     }
     sum += fare;
   }
   ```

   運賃が無いのは、呼ぶ側の前提が崩れた状態なので、黙って飛ばさず `throw` にします。
2. `string | undefined` です。配列の長さは実行するまで分からず、型チェックは数えられないためです。
3. (a) は `undefined`（祝日でないのは普通）、(b) は `throw`（画面は一覧から選ばせているので、見つからないのは食い違いのバグ）、(c) は `undefined`（見つからないのは普通）です。
