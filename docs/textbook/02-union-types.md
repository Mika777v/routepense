# 第2章 判別可能なユニオン型

## この章で学ぶこと

1. ユニオン型とリテラル型で「決まった形のどれか」を表す方法
2. `kind` で形を見分け、型を絞り込む（ナローイング）方法
3. `never` を使って、`case` の書き忘れを型エラーにする方法

## 前提知識

- 第1章（tsconfig と型チェック）
- Java の `interface`・`enum`・`switch`

| やりたいこと | Java（17 以降） | TypeScript |
|---|---|---|
| 決まった値のどれか | `enum Transport { TRAIN, BUS, OTHER }` | `type Transport = "train" \| "bus" \| "other"` |
| 決まった形のどれか | `sealed interface WorkStyle permits Remote, Commute, Holiday` と、それぞれの `record` | `type WorkStyle = { kind: "remote" } \| { kind: "commute"; ... } \| { kind: "holiday" }` |
| 形を見分ける | `switch (w) { case Commute c -> ... }`（パターンマッチ） | `switch (w.kind) { case "commute": ... }` |
| 全部の場合を扱ったか | `switch` 式なら、足りないとコンパイルエラー | `never` を使うと、足りないと型エラー |

大きな違いは、TypeScript では**クラスを作らない**ことです。ただのオブジェクトの「形」に名前を付けるだけで、`new` もしません。

## 概念の説明

### リテラル型

**定義**: リテラル型とは、`"train"` や `0` のような**特定の値だけ**を許す型です。

**理由**: 「文字列なら何でもよい」と書くと、`"Train"` や `"電車"` のような書き間違いを型チェックで見つけられないからです。

```ts
type Transport = "train" | "bus" | "other";

const t1: Transport = "bus";   // OK
const t2: Transport = "plane"; // 型エラー（わざと間違えています）
```

### ユニオン型

**定義**: ユニオン型（union type: 合併型）とは、`A | B` のように「A または B」を表す型です。`|` で並べた型のどれか1つにあてはまる値を入れられます。

### 判別可能なユニオン型

**定義**: 判別可能なユニオン型（discriminated union）とは、どの形にも共通のプロパティ（**判別子**: どの形かを示す目印。ここでは `kind`）があり、その値がリテラル型で形ごとに違うユニオン型です。

**理由**: 判別子の値を確かめるだけで、TypeScript が「今どの形か」を判断し、その形にしか無いプロパティを安全に使わせてくれるからです。

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2; // ここでは s は circle の形
    case "square":
      return s.size ** 2;             // ここでは s は square の形
  }
}
```

### ナローイング（型の絞り込み）

**定義**: ナローイング（narrowing）とは、`if` や `switch` で値を確かめた後、その分岐の中で型が狭くなることです。

上の例では、`case "circle":` の中で `s` の型が `Shape` から `{ kind: "circle"; radius: number }` に絞り込まれます。そのため `s.radius` を読めます。Java の `instanceof` のパターンマッチ（`if (s instanceof Circle c)`）に近い動きですが、TypeScript では**キャストも新しい変数も要りません**。

### never と網羅性チェック

**定義**: `never` は「あり得ない値」の型です。どんな値も `never` 型の変数には入れられません。

**理由**: `switch` で全部の `kind` を扱えば、`default` に来る値は残っていないので、その型は `never` になります。逆に、扱い忘れた `kind` があれば、それが `default` に残って `never` に入れられず、型エラーになります。これを**網羅性チェック**（exhaustiveness check）と呼びます。

```ts
function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}
```

## このプロジェクトでの実例

### 勤務区分 WorkStyle

`shared/src/work-style.ts`:

```ts
export type WorkStyle =
  | { kind: "remote" }
  | { kind: "commute"; routeId: string; route: RouteSnapshot }
  | { kind: "holiday" };
```

- 出勤（`commute`）だけが、どのルートで行ったか（`routeId` と、その時点のルートのコピー `route`）を持ちます
- 在宅と休日には、ルートの情報がありません。「在宅なのに `routeId` がある」という、おかしなデータを**型の時点で作れない**ようにしています
- 「未入力」は `WorkStyle` に入れていません。日次記録そのものが無い日として表します（要件定義 §5）

Java で同じことを書くと、次のようになります（比べるための参考です）。

```java
sealed interface WorkStyle permits Remote, Commute, Holiday {}
record Remote() implements WorkStyle {}
record Commute(String routeId, RouteSnapshot route) implements WorkStyle {}
record Holiday() implements WorkStyle {}
```

### 交通費の計算

`shared/src/fare.ts`:

```ts
export function workStyleFare(workStyle: WorkStyle): number {
  switch (workStyle.kind) {
    case "remote":
      return 0;
    case "commute":
      return workStyle.route.oneWayFare * 2; // commute に絞り込まれているので route を読める
    case "holiday":
      return 0;
    default:
      return assertNever(workStyle);
  }
}
```

この関数はフロントとバックの両方で使います。`shared/` に置いた理由は、画面に出す金額と、合計の計算がずれないようにするためです。

### リテラル型の実例

| 型 | ファイル | 値 |
|---|---|---|
| `Transport` | `shared/src/route.ts` | `"train" \| "bus" \| "other"` |
| `TripType` | `shared/src/extra-trip.ts` | `"oneWay" \| "roundTrip"` |
| `Weekday` | `shared/src/date.ts` | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6`（数のリテラル型） |
| `WorkStyleKind` | `shared/src/work-style.ts` | `WorkStyle["kind"]` から取り出した `"remote" \| "commute" \| "holiday"` |

`WorkStyle["kind"]` は**インデックスアクセス型**（型の中のプロパティの型を取り出す書き方）です。`WorkStyle` に種類を足すと、`WorkStyleKind` も自動で増えます。

## よくある間違いと、型エラーの読み方

以下のエラーは、どれも実際に `tsc` で出したものです（コードはわざと間違えています）。

### 1. case を書き忘れた

`holiday` の `case` を消すと:

```text
error TS2345: Argument of type '{ kind: "holiday"; }' is not assignable to parameter of type 'never'.
```

読み方: 「`{ kind: "holiday" }` の値を、`never` 型の引数に渡せない」。つまり、`default` に `holiday` が残っている、という意味です。足りない `kind` の名前がメッセージに出るので、何を書き忘れたかが分かります。

### 2. 絞り込まずに、一部の形にしか無いプロパティを読んだ

```ts
function f(w: WorkStyle) {
  return w.route.oneWayFare; // 型エラー（わざと間違えています）
}
```

```text
error TS2339: Property 'route' does not exist on type 'WorkStyle'.
  Property 'route' does not exist on type '{ kind: "remote"; }'.
```

読み方: 「`WorkStyle` には `route` が無いかもしれない。たとえば在宅の形には無い」。先に `if (w.kind === "commute")` などで絞り込みます。

### 3. 形に必要なプロパティが足りない

```ts
const w: WorkStyle = { kind: "commute" }; // 型エラー（わざと間違えています）
```

```text
error TS2322: Type '{ kind: "commute"; }' is not assignable to type 'WorkStyle'.
  Type '{ kind: "commute"; }' is missing the following properties from type '{ kind: "commute"; routeId: string; route: RouteSnapshot; }': routeId, route
```

読み方: 2行目の `missing the following properties` の後に、足りないプロパティの名前（`routeId, route`）が並びます。

### 4. 判別子の値を書き間違えた

```ts
const w: WorkStyle = { kind: "Remote" }; // 型エラー（わざと間違えています）
```

```text
error TS2820: Type '"Remote"' is not assignable to type '"remote" | "commute" | "holiday"'. Did you mean '"remote"'?
```

読み方: 使える値の一覧が出て、近いものを `Did you mean` で教えてくれます。

### 5. Java の感覚で、クラスと instanceof を使おうとする

TypeScript の型は実行するときに消える（第1章の型消去）ので、`w instanceof WorkStyle` のようには確かめられません。形を見分けるときは、判別子（`kind`）の値を確かめます。

## 練習問題

1. 勤務区分に「出張」（`{ kind: "businessTrip"; destination: string }`）を足すと、どのファイルで型エラーが出ますか？ 予想してから、実際に `shared/src/work-style.ts` に足して `npm run typecheck` で確かめてください（試した後は元に戻してください）。
2. 次の関数の `???` に入る型を、`WorkStyle` を使って書いてください。出勤の勤務区分だけを受け取る関数です。
   ```ts
   function routeName(w: ???): string {
     return w.route.name;
   }
   ```
3. `TripType` を `string` にすると、`extraTripFare` の `default: return assertNever(trip.tripType);` はどうなりますか？

## 理解の確認

> 勤務区分を `{ kind: string; routeId?: string; route?: RouteSnapshot }` という1つの型で表した場合と比べて、判別可能なユニオン型にすると何がうれしいでしょうか。「おかしなデータ」と「書き忘れ」の2つの言葉を使って説明してください。

## 解答

1. `shared/src/fare.ts` の `workStyleFare` で、`default` の `assertNever(workStyle)` が型エラーになります（`Argument of type '{ kind: "businessTrip"; destination: string; }' is not assignable to parameter of type 'never'.`）。`switch` で扱っていない `kind` が増えたためです。
2. `Extract<WorkStyle, { kind: "commute" }>`。`Extract` は、ユニオン型の中から条件に合う形だけを取り出す組み込みの型です。直接 `{ kind: "commute"; routeId: string; route: RouteSnapshot }` と書いても動きますが、`WorkStyle` を直したときに追従しません。
3. `string` には `"oneWay"` と `"roundTrip"` 以外の値も入るので、`default` に残る型が `string` になり、`never` に渡せず型エラーになります（`Argument of type 'string' is not assignable to parameter of type 'never'.`）。リテラル型にしておくと、どの値があり得るかを型チェックが知っていられます。
