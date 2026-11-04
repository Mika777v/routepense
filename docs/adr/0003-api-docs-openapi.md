# ADR-0003: API の仕様書は OpenAPI を手で書き、Swagger UI で見る

- 状態: 提案（オーナーの確認待ち）
- 日付: 2026-11-04
- 関係: Epic #94、Task #95

## 背景

backend の API は 15 個ある（health 1、ルート 4、日次記録・一括設定・追加の移動 8、経路検索 2）。
画面と backend は `shared/` の型を共有しているので、TypeScript のコードどうしの食い違いは型チェックで見つかる。

一方で、**人が読むための API の一覧**（URL・メソッド・送る本文・返るステータス）が無い。知るにはコード（`backend/src/*/*-router.ts`）を読むしかなく、`curl` などで手で試すときも本文の形を探すことになる。
オーナーから「人が見るように Swagger のようなものがあった方がよい」と提案があった（2026-11-04）。

## 調べた選択肢

| | 中身 | 良いところ | 気になるところ |
|---|---|---|---|
| A. OpenAPI を手で書き、Swagger UI で見る | `docs/api/openapi.yaml` を手で書く。backend が開発中に `/api/docs` で Swagger UI を出す | ブラウザで一覧を見られ、「Try it out」でその場で API を呼べる。OpenAPI は API の仕様書の業界標準で、学ぶ価値がある。今のコードは変えない | 依存が増える。手で書くので、コードと食い違い得る |
| B. コードから OpenAPI を作る | 受け口のバリデーションを zod などのスキーマに替え、そこから OpenAPI を作る | 食い違いが原理的に起きない | 受け口の判定（教科書 第4章の `unknown` と型ガード）を全部書き直す大きな変更。学習の題材として手で書いた判定を残したい |
| C. Markdown の一覧だけ | `docs/api.md` に表で書く | 依存が要らない | API を試せない。食い違いも防げない |

## 決定

**A にする。**

- 仕様書は `docs/api/openapi.yaml`（OpenAPI 3.1）に手で書く。本文の形は `shared/` の型に合わせ、エラーの本文は `ApiError`（`shared/src/api.ts`）
- backend は `/api/docs` で Swagger UI を出し、上のファイルを読み込んで表示する。画面からは `npm run dev` の Vite の proxy を通るので、`http://localhost:5173/api/docs` で開ける
- **正は `shared/` の型と backend のコード。** `openapi.yaml` はそれを人に向けて書き写したもの。食い違ったら `openapi.yaml` の方を直す

### 足す依存（backend）

| パッケージ | 版 | 何のため |
|---|---|---|
| `swagger-ui-express` | 5.0.1 | Swagger UI の画面を Express で出す（中で `swagger-ui-dist` を使う） |
| `yaml` | 2.9.1 | `openapi.yaml` を読み込む（Swagger UI にはオブジェクトで渡す）。一致のテストでも使う |
| `@types/swagger-ui-express`（開発用） | 4.1.8 | 上の型 |

版は 2026-11-04 に `npm view` で確かめた最新。

### 食い違いの防ぎ方

- **テスト**: `openapi.yaml` に書いた「メソッド＋パス」の一覧と、backend が実際に受け付ける「メソッド＋パス」の一覧が一致することを確かめる。片方だけに足すとテストが落ちる（方法は Task #96 で決める）
- **本文の形**は自動では照合しない。`shared/` の型が正で、型チェックが画面と backend の食い違いを見つける。`openapi.yaml` の本文の形は、API を変える PR で一緒に直す
- **運用ルール**: 「API を足す・変えるときは、同じ PR で `openapi.yaml` も直す」を CLAUDE.md に書く（Task #98。運用ルールの変更なので、オーナーが確認する）

## 影響

- backend の依存が3つ増える（うち1つは開発用）。`npm audit` の対象も増える
- `/api/docs` は認証なしで開ける。このアプリは自分の PC の localhost でだけ使う（要件定義 §2）ので問題にしない。外部に公開する場合は、出さないようにする
- API を足すたびに `openapi.yaml` を書く手間が増える
- 教科書の題材: OpenAPI（実行時に外から見える契約）と TypeScript の型（型チェックのときの契約）の違い

## 見直すとき

- API が増えて、手で書く手間や食い違いが目立ってきたとき → B（スキーマから作る）を、新しい ADR で検討する
- 複数ユーザー・外部への公開をするとき → `/api/docs` を出す条件を見直す
