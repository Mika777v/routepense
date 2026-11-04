# routepense

出勤ルートを登録し、日ごとに在宅か出勤かを選んで、期間をまとめて登録できる交通費の記録アプリ（個人用・学習用）。

- 要件定義: [docs/requirements.md](docs/requirements.md)
- 教科書: [docs/textbook/README.md](docs/textbook/README.md)
- GitHub の運用ルール: [docs/GITHUB_WORKFLOW.md](docs/GITHUB_WORKFLOW.md)

## 構成

| ディレクトリ | 中身 |
|---|---|
| `shared/` | フロントとバックで共有する型 |
| `backend/` | API サーバー（Node.js + Express）。3000番ポート |
| `frontend/` | 画面（React + Vite）。5173番ポート。`/api` は backend に回す |

npm の **ワークスペース**（1つのリポジトリで複数のパッケージをまとめて扱う仕組み）で3つをまとめています。

## 動かし方

Node.js 22.13 以上が必要です（SQLite を Node.js に組み込みの `node:sqlite` で使うため）。

```bash
npm install
```

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開くと、ルートの管理画面が出ます。ルートを登録して一覧に出れば、画面と API がつながっています。

## 経路検索（駅すぱあと API）のキー

ルートの登録で、駅名から経路結果のページを開く機能（要件 U1・[ADR-0002](docs/adr/0002-route-search.md)）は、駅すぱあと API フリープランのアクセスキーがあるときだけ使えます。キーが無くても、ほかの機能はそのまま動きます。

1. キーを申し込む: <https://api-info.ekispert.com/form/free/>（キーはメールで届きます。フォームの書き方と localhost の連絡文は [docs/ekispert-setup.md](docs/ekispert-setup.md)）
2. `backend/.env` を作り、キーを書く（`.env` は `.gitignore` 済みです。キーはリポジトリにもフロントにも置きません）

```bash
cp backend/.env.example backend/.env
```

```dotenv
EKISPERT_API_KEY=届いたキー
```

3. `npm run dev` で起動すると、backend のログに `経路検索: 駅すぱあと API フリープラン` と出ます。キーが無いときは `使えない` と出ます
4. ルートの画面のフォームに「経路を調べる（駅すぱあと）」の欄が出ます。キーが無いときは出ません（経路の URL の欄は、キーが無くても手で入れられます）

注意: フリープランのキーは、申し込みのときに書いたドメインに結び付きます。仕様書によると、localhost から使うと 403 になり、使うには `info@val.co.jp` への連絡が要ります。

## 月の明細を CSV で保存する

月次画面の「CSV で保存」で、表示中の月の交通費の明細を `routepense-YYYY-MM.csv` として保存できます（要件 F7）。

- 1行が1つの移動です（出勤日の通常ルートで1行、追加の移動1件ごとに1行）。金額の列を足すと、画面の月の合計と同じになります
- 文字コードは UTF-8（BOM 付き）なので、Excel でそのまま開いても文字化けしません
- 一括設定の当てはめ中は保存できません（先に登録するか、取り消します）。未入力の日は CSV に入りません

## 確認のコマンド

```bash
npm run typecheck && npm run lint && npm run test
```

| コマンド | すること |
|---|---|
| `npm run typecheck` | 3つのパッケージの型チェック（`tsc`） |
| `npm run lint` | 書き方の検査（ESLint） |
| `npm run test` | テスト（Vitest） |
