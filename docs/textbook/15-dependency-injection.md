# 第15章 インターフェースと実装の差し替え（依存性の注入）

## この章で学ぶこと

1. 依存性の注入（DI）の定義と、使う理由
2. TypeScript の `implements` と、Java の `implements` との違い
3. テストで外部のサービスを呼ばずに済ませる方法（偽物を渡す）

## 前提知識

- 第3章（インターフェースと構造的型付け）、第2章（判別可能なユニオン型）
- Java の `interface`・`implements`・コンストラクタ

| | Java | TypeScript |
|---|---|---|
| インターフェースを満たすと宣言する | `class A implements X`（書かないと X として渡せない） | `class A implements X`（書かなくても、形が合えば X として渡せる） |
| `implements` の役目 | 型の関係を作る | 形が合っているかを、クラスを書いた場所で確かめる（関係は作らない） |
| DI の道具 | Spring などのコンテナ（`@Autowired`） | 多くはコンテナを使わず、引数で渡すだけ |

## 概念の説明

**定義**: 依存性の注入（Dependency Injection、DI）とは、ある部品が使うもの（依存）を、部品の中で作らずに**外から渡してもらう**書き方です。部品はインターフェース（形）だけを知り、どの実装が来るかは知りません。

**理由**: 部品の中で実装を作ってしまうと、実装を替えるときに部品を書き直すことになり、テストでも本物（外部のサービス）を呼んでしまいます。外から渡せば、本番では本物を、テストでは偽物を渡せます。

```ts
interface Clock {
  now(): Date;
}

// 中で new Date() を呼ばず、Clock を引数で受け取る
function greeting(clock: Clock): string {
  return clock.now().getHours() < 12 ? "おはよう" : "こんにちは";
}

greeting({ now: () => new Date() });                       // 本番: 本物の時計
greeting({ now: () => new Date("2026-11-02T09:00:00") }); // テスト: 時刻を決めた偽物
```

渡すものを選んで組み立てる場所は、アプリの入り口の**1か所**にまとめます（組み立ての場所。英語では composition root）。

### `implements` は「確かめる」だけ

TypeScript は構造的型付け（第3章）なので、`implements` を書かなくても、形が合えばそのインターフェースとして渡せます。それでも `implements` を書くのは、メソッド名の打ち間違いなどを、**使う場所ではなくクラスを書いた場所**で型エラーにするためです。

## このプロジェクトでの実例

経路検索（要件 U1・ADR-0002）は、駅すぱあと API を使う実装と、キーが無いときの実装を差し替えられるようにしています。

インターフェース（`backend/src/route-search/route-search.ts`）:

```ts
export interface RouteSearch {
  readonly available: boolean;
  search(query: RouteSearchQuery): Promise<RouteSearchOutcome>;
}
```

2つの実装:

- `backend/src/route-search/ekispert-route-search.ts` の `EkispertFreeRouteSearch`: キーと `fetch` をコンストラクタで受け取る。`fetch` も外から渡せるので、テストでは外部の API を呼ばない
- `backend/src/route-search/unavailable-route-search.ts` の `UnavailableRouteSearch`: いつも「使えない」と返す

組み立ての1か所（`backend/src/server.ts`）で、環境変数を見て実装を選び、`createApp` に渡します。

```ts
createApp({
  routes: new SqliteRouteRepository(db),
  dailyRecords: new SqliteDailyRecordRepository(db),
  routeSearch: createRouteSearch(process.env), // キーがあれば駅すぱあと、無ければ「使えない」
  userId: LOCAL_USER_ID,
});
```

受け口（`backend/src/route-search/route-search-router.ts`）は `RouteSearch` しか知りません。テスト（`route-search-router.test.ts`）では、決まった結果を返す `StubRouteSearch` を渡して、200・404・502 などの応答を確かめています。

ルートと日次記録の保存（`RouteRepository`・`DailyRecordRepository`）も、同じ形で SQLite の実装を渡しています。

## よくある間違いと、型エラーの読み方

### 1. `implements` したのにメソッド名を打ち間違える（型エラーになる例）

```ts
// 型エラーになる例
class Broken implements RouteSearch {
  readonly available = false;
  serch() { return Promise.resolve({ kind: "unavailable" as const }); }
}
```

```
Class 'Broken' incorrectly implements interface 'RouteSearch'.
  Property 'search' is missing in type 'Broken' but required in type 'RouteSearch'.
```

「`Broken` は `RouteSearch` を正しく実装していない。`search` が無い」と読みます。`implements` を書かなければ、このエラーは `createApp` に渡す場所で、もっと長い文で出ます。

### 2. 部品の中で実装を作ってしまう

```ts
export function routeSearchRouter() {
  const routeSearch = new EkispertFreeRouteSearch(process.env.EKISPERT_API_KEY ?? "");
  // ...
}
```

型エラーにはなりませんが、テストで本物の API を呼んでしまい、キーの無い CI では落ちます。実装は引数で受け取ります。

### 3. 例外で失敗を伝える

外部のサービスの失敗を `throw` で伝えると、呼ぶ側は「何が投げられるか」を型から知れません。このプロジェクトでは、失敗も `RouteSearchOutcome`（判別可能なユニオン型）の値として返し、受け口の `switch` で漏れなく扱います（`default` の `assertNever` が、`kind` の書き忘れを型エラーにします）。

## 練習問題

1. 運賃も返す新しい実装 `FixedFareRouteSearch`（いつも URL `https://example.com` と運賃 `200` を返す）を、`RouteSearch` を `implements` して書いてください。
2. `createRouteSearch` で、環境変数 `ROUTE_SEARCH=fixed` のときに問1の実装を選ぶようにしてください。受け口（`route-search-router.ts`）を直す必要はありますか。
3. `EkispertFreeRouteSearch` のコンストラクタが `fetch` を受け取らず、中で直接 `fetch` を呼んでいたら、`ekispert-route-search.test.ts` はどう困りますか。

## 理解の確認

`UnavailableRouteSearch` から `implements RouteSearch` を消しても、型チェックは通ります。なぜ通るのか、そして消すと何が困るのかを説明してください。

## 解答

1.

```ts
export class FixedFareRouteSearch implements RouteSearch {
  readonly available = true;
  search(): Promise<RouteSearchOutcome> {
    return Promise.resolve({ kind: "found", url: "https://example.com", fare: 200 });
  }
}
```

引数を使わないメソッドは、引数を書かなくてもインターフェースを満たします（引数が少ない関数は、多い関数の代わりに使えるため）。

2.

```ts
export function createRouteSearch(env: Record<string, string | undefined>): RouteSearch {
  if (env.ROUTE_SEARCH === "fixed") return new FixedFareRouteSearch();
  const key = env.EKISPERT_API_KEY?.trim();
  return key ? new EkispertFreeRouteSearch(key) : new UnavailableRouteSearch();
}
```

受け口は直す必要がありません。受け口は `RouteSearch` の形しか知らず、`fare` があれば応答に入れる作りになっているためです。

3. テストのたびに本物の駅すぱあと API を呼ぶことになります。キーが要り、ネットワークにつながらない CI では落ち、応答（400・403・JSON でない応答など）を思いどおりに作れません。

理解の確認: TypeScript は構造的型付けなので、`available` と `search` を持っていれば `RouteSearch` として渡せるからです。消すと、メソッド名を打ち間違えたときのエラーがクラスの場所ではなく `createRouteSearch` の `return` の場所に出て、原因を探しにくくなります。
