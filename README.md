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

## 確認のコマンド

```bash
npm run typecheck && npm run lint && npm run test
```

| コマンド | すること |
|---|---|
| `npm run typecheck` | 3つのパッケージの型チェック（`tsc`） |
| `npm run lint` | 書き方の検査（ESLint） |
| `npm run test` | テスト（Vitest） |
