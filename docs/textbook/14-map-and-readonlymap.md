# 第14章 Map と ReadonlyMap（キーで引く一覧）

## この章で学ぶこと

1. `Map` の定義と、ふつうのオブジェクトを辞書として使うときとの違い
2. `ReadonlyMap` で「書き換えない一覧」を型で約束する方法
3. `get` の戻り値が `T | undefined` になる理由と、その受け取り方

## 前提知識

- 第5章（`Record`）、第11章（`undefined` と任意のプロパティ）
- Java の `Map<K, V>`・`HashMap`・`Map.of`

| | Java | TypeScript |
|---|---|---|
| キーで引く一覧 | `Map<String, String>`（インターフェース）と `HashMap`（実装） | `Map<string, string>`（クラス） |
| 書き換えられない一覧 | `Map.of(...)`（実行時に `put` で例外） | `ReadonlyMap<string, string>`（型チェックで `set` が型エラー） |
| 無いキーを引く | `get` が `null` を返す（型には出ない） | `get` が `undefined` を返す（戻り値の型が `string \| undefined`） |

Java の `Map.of` は「実行してみて `put` したら例外」で書き換えを止めます。TypeScript の `ReadonlyMap` は、書き換える**コードを書いた時点**で型エラーにします。そのかわり、実行時には止めません（下の「よくある間違い」の3）。

## 概念の説明

**定義**: `Map` とは、キーと値の組を持つ JavaScript の組み込みのクラスです。`get(キー)` で値を引き、`has(キー)` でキーがあるかを調べます。`ReadonlyMap` は、`Map` から `set`・`delete`・`clear`（書き換えるメソッド）を除いた**型**です（クラスではありません）。

```ts
const holidays: ReadonlyMap<string, string> = new Map([
  ["2026-11-03", "文化の日"],
  ["2026-11-23", "勤労感謝の日"],
]);

const name: string | undefined = holidays.get("2026-11-03"); // "文化の日"
const none = holidays.get("2026-11-04"); // undefined
```

**理由**: JavaScript では、ふつうのオブジェクト（`{ "2026-11-03": "文化の日" }`）もキーで引く一覧として使えます。ただ、オブジェクトは `Object.prototype` を受け継いでいるので、自分で入れていないキーでも値が返ることがあります。

```ts
const obj: Record<string, string> = { "2026-11-03": "文化の日" };
console.log(obj["constructor"]); // [Function: Object]（入れていないのに値がある）
console.log("constructor" in obj); // true
```

`Map` は、入れたキーだけを持ちます。`holidays.get("constructor")` は `undefined` です。キーが外から来る（画面や API の入力）なら、`Map` の方が安全です。

### get の戻り値が `T | undefined` になる理由

`Map` の型の定義では、`get` の戻り値は `V | undefined` です。どのキーが入っているかは実行するまで分からないので、「無いかもしれない」を型で示します。受け取る側は、第11章と同じように `undefined` の場合を書きます。

```ts
const label = holidays.get("2026-11-03") ?? "平日"; // 無ければ "平日"
```

`??`（null 合体演算子）は、左が `null` か `undefined` のときだけ右を使う演算子です。

## このプロジェクトでの実例

`shared/src/holidays.ts` に、祝日の一覧を `ReadonlyMap` で置きました（要件定義 F6）。

```ts
export const HOLIDAYS: ReadonlyMap<DateString, string> = new Map([
  // 2026年
  ["2026-01-01", "元日"],
  // ……
]);

/** 祝日なら祝日名を、祝日でなければ undefined を返す（純粋関数） */
export function holidayName(date: DateString): string | undefined {
  return HOLIDAYS.get(date);
}
```

- 型を `ReadonlyMap` にしたので、ほかのファイルから `HOLIDAYS.set(...)` と書くと型エラーになります。一覧を直すのは、このファイルを書き換えるときだけです
- `holidayName` の戻り値も `string | undefined` のままにしました。祝日でない日は `undefined` で、呼ぶ側（一括設定・カレンダー）が「祝日なら」の分岐を書きます
- `shared/src/holidays.test.ts` では、`holidayName("constructor")` が `undefined` になることも確かめています。オブジェクトで書いていたら、このテストは落ちます
- `for (const [date, name] of HOLIDAYS)` のように、`Map` はそのまま `for...of` で `[キー, 値]` の組を順に取り出せます。順番は**入れた順**です（Java の `HashMap` と違い、順番が決まっています。`LinkedHashMap` に近い）

## よくある間違いと、型エラーの読み方

### 1. `get` の結果を `string` の変数に入れる（型エラーになる例）

```ts
const name: string = HOLIDAYS.get("2026-11-03");
```

```
error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
```

「`string | undefined` は `string` に入れられない。`undefined` が入らないから」という意味です。直し方は、`?? "既定の値"` で埋めるか、`if (name !== undefined)` で絞り込んでから使います。`HOLIDAYS.get(...)!`（`!` で「undefined ではない」と言い切る）は、うそをついても型エラーにならないので、この形では使いません。

### 2. `ReadonlyMap` に `set` する（型エラーになる例）

```ts
HOLIDAYS.set("2026-11-04", "休み");
```

```
error TS2339: Property 'set' does not exist on type 'ReadonlyMap<string, string>'.
```

「`ReadonlyMap` 型には `set` というプロパティが無い」という意味です。`ReadonlyMap` は `set` を除いた型なので、メソッドそのものが見えなくなります。

### 3. `ReadonlyMap` なら、実行時にも書き換えられないと思う

`ReadonlyMap` は型だけの約束です。中身は `new Map(...)` で作ったふつうの `Map` なので、`(HOLIDAYS as Map<string, string>).set(...)` のように型を変えれば、実行時には書き換えられます。型チェックを通るコードだけで書いている間は、書き換わりません。

## 練習問題

1. 次のコードの `a`・`b`・`c` の値は何ですか。

   ```ts
   const m = new Map([["x", 1]]);
   const a = m.get("x");
   const b = m.get("y");
   const c = m.has("toString");
   ```

2. `holidayName` を使って、「祝日なら祝日名、そうでなければ空の文字列」を返す関数 `holidayLabel(date: DateString): string` を書いてください。
3. `const OBJ: Record<string, string> = { a: "A" }` で、`OBJ["b"]` の型は何ですか。このプロジェクトの tsconfig（`noUncheckedIndexedAccess` が ON）と、OFF のときの両方を答えてください。

## 理解の確認

祝日の一覧を、ふつうのオブジェクトではなく `Map` で持った理由を、`holidayName("constructor")` を例に1文で説明してください。

## 解答

1. `a` は `1`、`b` は `undefined`、`c` は `false`（`Map` は入れたキーだけを持つ。`toString` は入れていない）
2. 例:

   ```ts
   function holidayLabel(date: DateString): string {
     return holidayName(date) ?? "";
   }
   ```

3. ON なら `string | undefined`、OFF なら `string`。`Record<string, string>` は「どんなキーでも値がある」という型なので、OFF のときは無いキーでも `string` と見なされます。`noUncheckedIndexedAccess` は、キーで引いた結果に `undefined` を足して、`Map` の `get` と同じように扱わせる設定です（第1章）
