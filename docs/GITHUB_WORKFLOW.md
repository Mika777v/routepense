# GitHub の運用ルール

knowledge-navigator で使っている運用を、このリポジトリの規模に合わせて小さくしたもの。
Claude が守るルールの要点は `CLAUDE.md` の「git の運用」にあり、このファイルでは理由と設定の手順を説明する。

## 1. 全体の流れ

```
main ──●─────────●─────────●──   （常に動く状態）
        \       /  \      /
         feat/...    fix/...      ← 1つの作業 = 1ブランチ = 1 PR
```

1. 最新の main からブランチを切る
2. コミットして push し、PR を作る
3. CI（`ci-ok` と `conventional-commits`）が通ったら、GitHub が自動でスカッシュマージする
4. 「確認が必要な項目」（§4）に当てはまる PR だけは自動マージを予約せず、オーナーが内容を見てからマージする

- **GitHub Flow**（ジーフロー）: main と、作業ごとの短いブランチだけで回すやり方。develop ブランチなどは作らない
- **スカッシュマージ**: PR の中の複数のコミットを1つにまとめて main に入れるマージ方式。main の履歴が「1 PR = 1 コミット」になる
- **自動マージ（auto-merge）**: 「チェックが通ったらマージする」と予約しておく GitHub の機能

## 2. ブランチ名

| 種類 | 命名 | 例 |
|---|---|---|
| 機能追加 | `feat/<内容>` | `feat/route-api` |
| バグ修正 | `fix/<内容>` | `fix/bulk-weekday` |
| ドキュメント | `docs/<内容>` | `docs/textbook-union-types` |
| その他 | `chore/` `refactor/` `test/` `ci/` | `ci/add-lint` |

Claude Code のクラウドのセッションで、使うブランチが指定されている場合（`claude/...`）は、そちらに従う。

## 3. PR のタイトルとコミット（Conventional Commits）

スカッシュマージでは **PR のタイトルがそのまま main のコミットメッセージになる**ため、PR のタイトルを決まった形にそろえる。CI の `pr-title.yml` で形式を確かめる。

```
<type>(<scope>): <内容>
例: feat(backend): ルート登録APIを追加
```

| type | 用途 |
|---|---|
| `feat` | 機能追加 |
| `fix` | バグ修正 |
| `docs` | ドキュメント（要件定義・教科書を含む） |
| `refactor` | 振る舞いを変えない書き直し |
| `perf` | 性能改善 |
| `test` | テストだけの変更 |
| `build` / `ci` | ビルド・CI |
| `chore` | 雑務 |
| `revert` | 取り消し |

scope（省略可）: `frontend` `backend` `shared` `db` `docs` `textbook` `ci` `deps`

## 4. 自動マージしない「確認が必要な項目」

次のどれかに当てはまる PR は、自動マージを予約しない。PR 本文の「確認が必要な項目」に書き、オーナーが読んでからマージする。

| 項目 | 理由 |
|---|---|
| ADR の追加・変更（`docs/adr/`） | 後から変えにくい判断。オーナーが読んで学ぶため、本文に選択肢と決めた理由を短くまとめる |
| DB のスキーマの変更（テーブル定義・マイグレーション） | すでにあるデータに影響し、戻しにくい |
| 要件定義の変更（`docs/requirements.md`） | 何を作るかはオーナーが決める |
| 運用ルール・CI・リポジトリ設定の変更（`CLAUDE.md`・`.github/`・`scripts/github/`） | 自動マージの仕組みそのものを変えるため |
| 依存ライブラリのメジャーバージョンの更新 | 動きが変わりやすい |
| 認証・権限まわり（将来、複数ユーザーにするとき） | 安全に関わる |
| タグ・GitHub Release | 公開の区切りになる |

## 5. 守ること

- **force push（ブランチの強制上書き）はしない。** push 済みのブランチの履歴は書き換えない（rebase・amend してからの push をしない）
- マージされた PR を直す・続きをするときは、最新の main から新しいブランチを切り、別の PR にする
- まだマージされていない PR を直すときは、同じブランチにコミットを足して push する。main の変更を取り込むときは rebase ではなく merge する
- 同時に開いている PR どうしで、同じファイルの同じ箇所を触らない
- CI が落ちたら、原因を直して push し直す（テストを消したり飛ばしたりして通さない）

## 5.1 Issue

| 種類 | テンプレート | 単位 | 例 |
|---|---|---|---|
| Epic | `.github/ISSUE_TEMPLATE/epic.yml` | 「進め方」の1ステップ | `[Epic] E04 日次記録と一括設定のロジック` |
| Task | `.github/ISSUE_TEMPLATE/task.yml` | 1つの PR（ときに2つ）で終わる作業。Epic の sub-issue にする | `[Task] E04-T2 一括設定の対象日の計算` |
| Bug | `.github/ISSUE_TEMPLATE/bug.yml` | 不具合 | |

- PR の本文に `Closes #<Task>` を書くと、マージで Task が自動で閉じる
- ラベル: `type:epic`・`type:task`・`type:bug`、`area:frontend`・`area:backend`・`area:shared`・`area:db`、確認が必要な作業は `needs-confirm`

## 6. CI の構成

| ワークフロー | ジョブ | 内容 |
|---|---|---|
| `.github/workflows/ci.yml` | `checks` | `package.json` があれば、`npm ci` → 型チェック → lint → テストを実行（スクリプトがあるものだけ） |
| | `ci-ok` | **必須チェック。** ほかのジョブの結果をまとめ、失敗があれば落ちる |
| `.github/workflows/pr-title.yml` | `conventional-commits` | **必須チェック。** PR タイトルの形式を確かめる |

- **ゲートジョブ**: いくつものチェックの結果を1つにまとめるジョブ。必須チェックを `ci-ok` 1つにしておけば、チェックを増やしてもリポジトリの設定を変えずに済む
- 雛形を作ったら、`package.json` に `typecheck`・`lint`・`test` のスクリプトを用意する。そうすれば CI が自動で実行する

## 7. リポジトリの設定（最初に1回だけ）

自動マージを使うには、リポジトリの設定と main の保護（必須チェック）が必要。GitHub の画面か、スクリプトで設定する。

**順番に注意**: まだ main に無いチェックを必須にすると、どの PR もマージできなくなる。
そのため、CI のファイルを入れる PR（最初の PR）は手でマージし、その後に設定する。

### 7.1 スクリプトで設定する（GitHub CLI がある場合）

```bash
gh auth login
```

```bash
bash scripts/github/setup-repo.sh
```

### 7.2 画面で設定する

1. リポジトリの **Settings → General → Pull Requests**
   - 「Allow merge commits」と「Allow rebase merging」のチェックを外し、「Allow squash merging」だけを残す
   - squash のメッセージは「Pull request title and description」を選ぶ
   - 「Allow auto-merge」にチェックを入れる
   - 「Automatically delete head branches」にチェックを入れる
2. **Settings → Rules → Rulesets → New ruleset → New branch ruleset**
   - Ruleset name: `main-protection`、Enforcement status: `Active`
   - Target branches: 「Add target」→「Include default branch」
   - 次にチェックを入れる:
     - Restrict deletions
     - Require linear history
     - Require a pull request before merging（Required approvals は `0`、Allowed merge methods は `Squash` だけ）
     - Require status checks to pass → 「Add checks」で `ci-ok` と `conventional-commits` を追加
     - Block force pushes
   - 「Create」を押す

### 7.3 確かめ方

- Settings → Rules → Rulesets に `main-protection` があり、Active になっている
- 次の PR の画面で「Enable auto-merge」のボタンが出る
