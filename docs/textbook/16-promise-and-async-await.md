# 第16章 待つ処理の型（Promise と async / await）

## この章で学ぶこと

1. `Promise<T>` の定義と、`async` / `await` が何をしているか
2. `await` の前と後で「時間が経っている」ことと、それが画面の作りに効く場面
3. 失敗を例外ではなく値（`ApiResult`）で返す書き方と、`Promise` の組み合わせ

## 前提知識

- 第2章（判別可能なユニオン型）、第15章（失敗を値として返す）
- Java の `CompletableFuture<T>`

| | Java | TypeScript |
|---|---|---|
| 後で値が届くことを表す型 | `CompletableFuture<T>` | `Promise<T>` |
| 届いた値を使う | `future.thenApply(...)`・`future.get()`（スレッドを止めて待つ） | `promise.then(...)`・`await promise`（スレッドは止めない） |
| 待つ間のほかの処理 | ほかのスレッドが動く | 同じスレッドで、ほかの処理（クリック・描画）が動く |

JavaScript のスレッドは1本です。`await` はスレッドを止めるのではなく、「この関数の続きを、値が届いた後に回す」という意味です。

## 概念の説明

**定義**: `Promise<T>`（プロミス、「約束」）は、**今はまだ無いが、後で `T` 型の値が届く（または失敗する）**ことを表す値です。`async` を付けた関数は、必ず `Promise` を返します。`await` は、その `Promise` の値が届くまで関数の続きを待たせ、届いた `T` を取り出します。

**理由**: 通信（`fetch`）のように時間のかかる処理の間も、画面を固めずにクリックや描画を続けるためです。型が `Promise<T>` なので、「まだ届いていない値」を `T` と取り違えると型エラーで気づけます。

```ts
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hello(): Promise<string> {
  console.log("1. 待つ前");
  await wait(100); // ここで関数を抜け、100ms 後に続きから再開する
  console.log("3. 待った後");
  return "done"; // async 関数の return は Promise<string> の中身になる
}

const p = hello(); // p の型は Promise<string>（string ではない）
console.log("2. hello を呼んだ直後"); // 待っている間に、こちらが先に動く
p.then((value) => console.log(`4. ${value}`));
```

表示は 1 → 2 → 3 → 4 の順です。`hello()` は `await` のところで呼び出し元に戻るので、「2」が「3」より先に出ます。

## このプロジェクトでの実例

### 1. 失敗も値で返す `request`（`frontend/src/api-client.ts:13`）

```ts
export async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, { ... });
  } catch {
    return { ok: false, error: { error: "サーバーに接続できません。…" } };
  }
  ...
}
```

`fetch` は、backend が止まっているとき失敗する（例外を投げる）`Promise` を返します。`request` は `try` / `catch` でそれを受け止め、`Promise<ApiResult<T>>` という「**必ず成功し、中身で成否が分かる**」`Promise` に変えます。呼ぶ側は `await` の後に `result.ok` を見るだけで済み、`try` / `catch` を書き忘れる心配がありません。

### 2. 経路検索の API の呼び出し（`frontend/src/routes/route-search-api.ts:15`）

```ts
export function searchRoute(from: string, to: string): Promise<ApiResult<RouteSearchResponse>> {
  const query = new URLSearchParams({ from, to });
  return request<RouteSearchResponse>(`${BASE}?${query.toString()}`);
}
```

この関数には `async` が付いていません。中で `await` しないなら、`request` が返す `Promise` をそのまま返せば十分です。戻り値の型は同じ `Promise<ApiResult<…>>` です。

### 3. `await` の前にタブを開く（`frontend/src/routes/RouteSearchBox.tsx:25`）

```ts
async function handleSearch() {
  const tab = window.open("", "_blank"); // ① クリックの直後: 空のタブを開く
  const query = stationQuery(stations, route);
  const result = await searchRoute(query.from, query.to); // ② ここで時間が経つ
  if (!result.ok) {
    tab?.close(); // 失敗したら、開いたタブを閉じる
    ...
    return;
  }
  ...
  tab.location.href = result.value.url; // ③ 届いた URL へ移動させる
}
```

ブラウザは、**クリックの直後**に開くタブだけを許し、時間が経ってから開くタブは広告とみなして止めます（ポップアップブロック）。`await` の後は「クリックの直後」ではありません。そこで、`await` の**前**に空のタブを開いておき、URL が届いてから移動させます。「`await` の前と後で時間が経っている」ことが、画面の作りに直接効く例です。

### 4. 画面を閉じた後に届いた値を捨てる（`frontend/src/routes/RoutesPage.tsx:26`）

```ts
useEffect(() => {
  let active = true;
  getRouteSearchStatus().then((result) => {
    if (!active) return; // 届いたときにはもう画面が無い
    setRouteSearchAvailable(result.ok && result.value.available);
  });
  return () => {
    active = false;
  };
}, []);
```

`Promise` は途中で取り消せません。値が届くまでの間に画面が閉じられることがあるので、「まだこの画面が使われているか」を変数に持ち、届いた値を使う前に確かめます。

## よくある間違いと、型エラーの読み方

### 1. `await` を書き忘れる（型エラーになる例）

```ts
const result = searchRoute("中野", "東京"); // await が無い
if (result.ok) {
  // error TS2339: Property 'ok' does not exist on type 'Promise<ApiResult<RouteSearchResponse>>'.
}
```

「`Promise<…>` に `ok` は無い」と言われたら、`await` の書き忘れです。`result` はまだ「約束」で、中身ではありません。

### 2. 結果を待たずに捨てる（型エラーにならない例）

```ts
<button onClick={() => handleSearch()}>…</button>
```

型チェックは通りますが、`handleSearch` が返す `Promise` が誰にも使われていません。中で起きた失敗に誰も気づけない書き方です。このプロジェクトでは、`request` が失敗を値で返すので例外は起きませんが、**わざと待たない**ことを読む人に示すため、`void handleSearch()` と書く決まりにしています（`void` は「戻り値を捨てる」という演算子）。lint の `@typescript-eslint/no-floating-promises` を有効にすると、この書き忘れを見つけられます（今は有効にしていません）。

### 3. `await` の後で「クリックの直後」のつもりで書く

`window.open(url)` を `await` の後に書くと、型チェックも lint も通りますが、ブラウザがタブを止めます（`window.open` は `null` を返します）。戻り値の型が `Window | null` なのは、この「開けなかった」場合があるためです。`tab?.close()` の `?.` は、`null` のときは何もしない、という意味です。

## 練習問題

1. 次のコードは何をどの順に表示しますか。

   ```ts
   async function f(): Promise<number> {
     console.log("A");
     await Promise.resolve();
     console.log("B");
     return 1;
   }
   f().then((n) => console.log(`C${n}`));
   console.log("D");
   ```

2. `getRouteSearchStatus` と `listRoutes` を**同時に**呼び、両方が届いてから処理する関数を、`Promise.all` を使って書いてください。戻り値の型も書いてください。
3. `searchRoute` に `async` を付けて `return await request(...)` と書いても、呼ぶ側から見た違いはありますか。

## 理解の確認

`RouteSearchBox` の `handleSearch` で、`window.open("", "_blank")` を `await searchRoute(...)` の後ろへ移すと、何が起きますか。また、型の上ではそれに気づけないのはなぜですか。

## 解答

1. `A` → `D` → `B` → `C1`。`f()` は `await` のところで呼び出し元に戻るので、`D` が `B` より先に出ます。

2.

   ```ts
   async function loadAll(): Promise<[ApiResult<RouteSearchStatus>, ApiResult<Route[]>]> {
     return Promise.all([getRouteSearchStatus(), listRoutes()]);
   }
   ```

   `Promise.all` に配列を渡すと、それぞれの中身の型を並べたタプル（要素ごとに型の決まった配列）の `Promise` を返します。2つの通信を順に待つより早く終わります。

3. 呼ぶ側から見た型（`Promise<ApiResult<RouteSearchResponse>>`）も動きも同じです。`async` は「中で `await` を使いたいとき」に付けるもので、`Promise` を返すだけなら要りません。
