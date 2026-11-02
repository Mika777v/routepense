# 第3章 インターフェースと構造的型付け

## この章で学ぶこと

1. TypeScript の `interface` と `implements` の書き方
2. 「構造的型付け」: 名前ではなく形で型が合うかを決める考え方
3. インターフェースで DB を隠し、差し替えやすくする方法（リポジトリ）

## 前提知識

- 第2章（判別可能なユニオン型）
- Java の `interface`・`implements`・クラス

| | Java | TypeScript |
|---|---|---|
| 型が合うかの決め方 | **名前**で決まる（`implements` と書いたクラスだけが、その型になる） | **形**で決まる（必要なメソッドとプロパティがそろっていれば、その型として使える） |
| `implements` | 必須 | 任意。書くと「形がそろっているか」をクラスの定義の時点で確かめてくれる |
| インターフェースの実装 | クラスだけ | クラスでも、ただのオブジェクトでもよい |
| 実行するとき | インターフェースは残る（`instanceof` が使える） | 消える（型消去。第1章） |

## 概念の説明

### interface

**定義**: `interface` は、オブジェクトが持つべきプロパティとメソッドの形に名前を付けたものです。

```ts
interface Greeter {
  greet(name: string): string;
}
```

`type Greeter = { greet(name: string): string }` と書いても、ほぼ同じ意味です。このプロジェクトでは、データの形には `type`、「こういう操作ができるもの」という窓口には `interface` を使っています。

### 構造的型付け

**定義**: 構造的型付け（structural typing）とは、型の名前ではなく、**中身の形が合っているか**で代入できるかを決める仕組みです。

**理由**: JavaScript のオブジェクトは、クラスを使わずに `{ ... }` で気軽に作られます。名前で決める仕組みだと、そうしたオブジェクトに型を付けられないためです。

```ts
interface Greeter {
  greet(name: string): string;
}

// クラスを作らず、implements も書いていないが、形が合うので Greeter として使える
const japanese: Greeter = {
  greet: (name) => `こんにちは、${name}さん`,
};
```

Java では、`Greeter` を `implements` していないクラスのオブジェクトは、メソッドがそろっていても `Greeter` の変数に入れられません。TypeScript では入れられます。

### implements

**定義**: クラスに `implements インターフェース名` と書くと、そのクラスがインターフェースの形を満たしているかを、クラスの定義の時点で確かめます。

構造的型付けなので `implements` は無くても動きます。それでも書くのは、**メソッドの書き忘れや引数の型の間違いを、クラスを書いたその場所で見つけるため**です。書かないと、そのクラスを使う側で初めてエラーが出ます。

## このプロジェクトでの実例

### リポジトリで DB を隠す

**リポジトリ**（repository）とは、データの保存と読み出しを受け持つ窓口のことです（Git のリポジトリとは別の意味です）。

`backend/src/routes/route-repository.ts`:

```ts
export interface RouteRepository {
  list(userId: string): Route[];
  get(userId: string, id: string): Route | undefined;
  create(userId: string, input: RouteInput): Route;
  update(userId: string, id: string, input: RouteInput): Route | undefined;
  delete(userId: string, id: string): boolean;
}
```

`backend/src/routes/sqlite-route-repository.ts` が、これを SQLite で実装します。

```ts
export class SqliteRouteRepository implements RouteRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => Date = () => new Date(),
  ) {}
  // list / get / create / update / delete
}
```

次のステップで作る API は `RouteRepository` だけを使い、SQLite のことを知りません。DB を替えるときは、`RouteRepository` を実装する別のクラスを作り、組み立てる1か所を差し替えれば済みます（`docs/adr/0001-sqlite-driver.md`）。

### コンストラクタ引数のプロパティ

`constructor(private readonly db: DatabaseSync)` は、**パラメータプロパティ**（引数に `private` などを付けると、同じ名前のプロパティが自動で作られて代入される書き方）です。Java で書くと次と同じです。

```java
private final DatabaseSync db;
public SqliteRouteRepository(DatabaseSync db) { this.db = db; }
```

### 時刻を外から渡す

`now: () => Date` を引数で受け取り、ふだんは `new Date()` を使います。テスト（`sqlite-route-repository.test.ts`）では、1秒ずつ進む時計を渡して、「登録した順に並ぶ」ことを確かめています。外の状態（今の時刻）に頼る部分を引数にすると、テストで結果を固定できます。

### 列名と型の対応

DB の列は SQL の慣習で `snake_case`（`one_way_fare`）、TypeScript の型は `camelCase`（`oneWayFare`）です。`RouteRow` 型（DB の1行）と `toRoute` 関数（`Route` への変換）で、この違いを1か所に閉じ込めています。

## よくある間違いと、型エラーの読み方

以下のエラーは、実際に `tsc` で出したものです（コードはわざと間違えています）。

### 1. implements したのにメソッドが足りない

`delete` を書き忘れると:

```text
error TS2420: Class 'Broken' incorrectly implements interface 'RouteRepository'.
  Property 'delete' is missing in type 'Broken' but required in type 'RouteRepository'.
```

読み方: 2行目の `Property '〇〇' is missing` で、足りないメソッドの名前が分かります。

### 2. 引数の型が合わない

```ts
const wrong: RouteRepository = { ...memory, delete: (userId: number) => userId > 0 }; // 型エラー（わざと間違えています）
```

```text
error TS2322: Type '(userId: number) => boolean' is not assignable to type '(userId: string, id: string) => boolean'.
  Types of parameters 'userId' and 'userId' are incompatible.
    Type 'string' is not assignable to type 'number'.
```

読み方: メッセージは外側から内側へ、3段で詳しくなります。1行目は「関数の型が合わない」、2行目は「引数 `userId` どうしが合わない」、3行目は「`string` を `number` に入れられない」です。**いちばん下の行が、直す場所**のことが多いです。

### 3. 「implements していないから使えない」と思い込む

Java の感覚では、`implements` を書いていないオブジェクトは使えないと思いがちです。TypeScript では、形が合えば使えます。テスト用に、配列にしまうだけの簡単なリポジトリを `{ list: ..., get: ..., ... }` で作ることもできます。

### 4. 実行するときにインターフェースで確かめようとする

`if (repo instanceof RouteRepository)` は書けません。インターフェースは実行するときには消えているためです（第1章の型消去）。

## 練習問題

1. 次のオブジェクトは `RouteRepository` として使えますか？ 理由も答えてください。
   ```ts
   const repo = {
     list: () => [],
     get: () => undefined,
     create: (userId: string, input: RouteInput) => ({ id: "1", userId, ...input }),
     update: () => undefined,
     delete: () => true,
     count: () => 0,
   };
   const r: RouteRepository = repo;
   ```
2. `SqliteRouteRepository` から `implements RouteRepository` を消すと、どこでエラーが見つかるようになりますか？
3. テストで、`SqliteRouteRepository` に今の時刻ではなく固定の時刻を渡しているのはなぜですか？

## 理解の確認

> 「API は `RouteRepository` だけを使い、SQLite のことを知らない」ようにすると、DB を替えるときに何が楽になるでしょうか。Java の経験がある人向けに、Java の interface との違い（形で決まること）にも触れて説明してください。

## 解答

1. 使えます。必要な5つのメソッドが、合う型でそろっているためです。`count` が余分にありますが、構造的型付けでは、足りないものが無ければ余分なものがあっても代入できます（ただし `const r: RouteRepository = { ... }` のように、オブジェクトを直接書いて代入すると、余分なプロパティは書き間違いの疑いとしてエラーになります。これを**余剰プロパティチェック**と呼びます）。
2. クラスの定義では見つからなくなります。そのクラスを `RouteRepository` 型の変数や引数に渡す場所（次のステップで作る API の組み立て）で、初めてエラーになります。
3. 今の時刻を使うと、実行するたびに値が変わり、「登録した順に並ぶ」ことを確かめられないためです。時刻を引数で受け取ると、テストでは決まった時刻を渡して、結果を固定できます。
