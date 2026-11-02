# 進み具合（セッションの引き継ぎ）

新しいセッションは、`CLAUDE.md` の次にこのファイルを読んで続きを始める。
セッションを終える前に、このファイルを更新して PR にする（`CLAUDE.md`「セッションとコンテキストの使い方」）。

- 最終更新: 2026-11-02

## ステップ（CLAUDE.md「進め方」）

| # | ステップ | 状態 | PR |
|---|---|---|---|
| 0 | 要件定義・git の運用ルール | 完了 | [#1](https://github.com/Mika777v/routepense/pull/1)・[#2](https://github.com/Mika777v/routepense/pull/2)・[#4](https://github.com/Mika777v/routepense/pull/4) |
| 1 | 雛形（フロントとバックが動く） | 完了 | [#3](https://github.com/Mika777v/routepense/pull/3) |
| 2 | 共有の型 | 完了 | [#5](https://github.com/Mika777v/routepense/pull/5) |
| 3 | ルートの登録 API と画面 | **途中**（DB と API まで。画面がまだ） | [#7](https://github.com/Mika777v/routepense/pull/7)・[#9](https://github.com/Mika777v/routepense/pull/9) |
| 4 | 一括登録のロジックとテスト | 未着手 | |
| 5 | 一括登録の画面 | 未着手 | |
| 6 | 月ごとの一覧と合計 | 未着手 | |

## 開いている PR（この更新の時点）

| PR | 内容 | 待っていること |
|---|---|---|
| [#6](https://github.com/Mika777v/routepense/pull/6) | `frontend-design` スキルを `.claude/skills/` に追加 | オーナーの確認とマージ |
| [#8](https://github.com/Mika777v/routepense/pull/8) | ADR-0001 の状態を「決定」にする | オーナーの確認とマージ |
| [#9](https://github.com/Mika777v/routepense/pull/9) | ルートの API | CI → 自動マージ |
| この PR | セッションの使い方のルールと、このファイル | オーナーの確認とマージ |

## 次にやること

1. **ステップ3の残り: ルートの管理画面**（`frontend/`）
   - 一覧・登録・編集・削除。API は `GET/POST/PUT/DELETE /api/routes`（`backend/src/routes/route-router.ts`）
   - 入力の誤りは、API が返す `fieldErrors`（`shared/src/api.ts`）を欄ごとに表示する
   - 交通手段の選択肢は `TRANSPORTS`（`shared/src/route.ts`）から作る
   - デザインは `.claude/skills/frontend-design`（PR #6 のマージ後）に沿う
   - 教科書: React のフォームの章を書く
2. ステップ3を終えたら区切りの報告をして、新しいセッションでステップ4へ

## 会話で決めたこと（ほかの文書に無いもの）

- **作業ブランチ**: 作業ごとに `feat/...`・`fix/...`・`docs/...` などの新しいブランチを切って push してよい（2026-11-02 にオーナーが許可）
- **見送ったツール**（2026-11-02）: 中身を読んだうえで、次の2つは入れないことにした
  - Ponytail（`DietrichGebert/ponytail`）: 「コードと説明を最小にする」方針が、学習のために理由を添える方針・将来に備えた作り（ユーザーIDなど）とぶつかる
  - Graphify（`Graphify-Labs/graphify`）: ファイルが少ないうちは効果が薄い。ファイルが数百を超えたら考え直す
- **claude.ai のアカウントのスキル**: 文書作成（docx・pdf・pptx・xlsx）・`skill-creator` はアカウントで有効なので、どのセッションでも使える。リポジトリには入れない
