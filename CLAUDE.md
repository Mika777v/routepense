# routepense

楽々精算のような経費精算アプリ。特に「出勤ルートを登録し、日ごとに在宅か出勤ルートを選んで期間をまとめて登録できる」一括入力を実現する。個人利用から始め、学習目的も兼ねる。

## 技術スタック
- 言語: TypeScript（フロント・バックエンドとも）
- フロント: React + Vite
- バックエンド: Node.js + Express（または Fastify）
- DB: SQLite（開発用。後で差し替えやすい構成にする）
- テスト: Vitest
- パッケージ管理: npm

## 設計方針
- 勤務区分は判別可能なユニオン型で表す（例: `{ kind: "remote" } | { kind: "commute"; routeId: string }`）。フロントとバックで同じ型を共有する
- 型は `shared/` ディレクトリに置き、フロントとバックの両方から参照する
- 日付は文字列（YYYY-MM-DD）で扱い、タイムゾーンのずれを避ける
- 一括登録のロジックは純粋関数にしてテストを書く
- バリデーションは入力の境界（APIの受け口）で行う

## スコープ外（後回し）
- 承認フロー、複数ユーザー、認証
- 経費の自動計算（経路探索など）
- CSV出力、PDF出力

## 必ず守ること（要点。全文と理由は `docs/DEV_RULES.md`）
- **1つの作業 = 1ブランチ = 1 PR。** 最新の main から切る（クラウドのセッションでブランチが指定されていればそれに従う）。止めずに PR を作り続け、自動マージ（スカッシュ）を予約する
- **自動マージせずオーナーに確認する PR**: ADR・DB のスキーマ・要件定義・運用ルール（この `CLAUDE.md`・`docs/DEV_RULES.md`）・CI・リポジトリ設定・依存のメジャー更新・認証/権限・タグ/Release。PR 本文の「確認が必要な項目」に書く
- **force push しない。** マージ済みの PR の続きは新しいブランチで。main の取り込みは merge
- PR のタイトルは Conventional Commits（`pr-title.yml` の type・scope だけ）。本文は `.github/pull_request_template.md` に沿う
- PR の前に `npm run typecheck && npm run lint && npm run test` を通す
- 画面のメッセージ・API のステータス・起動のログを変えたら、`docs/troubleshooting.md` も同じ PR で直す
- 作業の単位は Issue（Epic・Task）。PR の本文に `Closes #Task`
- 区切りで止まって報告し、セッションを終える前に `docs/PROGRESS.md` を更新する

## いつ何を読むか
| 作業 | 先に読むもの |
|---|---|
| ブランチ・PR・自動マージ | `docs/DEV_RULES.md`「git の運用」・`docs/GITHUB_WORKFLOW.md` |
| Issue を作る・閉じる・次の作業を選ぶ | `docs/DEV_RULES.md`「Issue の使い方」 |
| セッションを始める・終える・区切りの報告 | `docs/DEV_RULES.md`「セッションとコンテキストの使い方」→ `docs/PROGRESS.md` |
| 何を作るか | `docs/requirements.md`（MVP の一覧と進め方は `docs/DEV_RULES.md`） |
