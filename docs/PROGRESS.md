# 進み具合（セッションの引き継ぎ）

新しいセッションは、`CLAUDE.md` の次にこのファイルを読んで続きを始める。
セッションを終える前に、このファイルを更新して PR にする（`CLAUDE.md`「セッションとコンテキストの使い方」）。

- 最終更新: 2026-11-02

## ステップ（CLAUDE.md「進め方」）と Epic

作業の単位は Issue で管理する（`CLAUDE.md`「Issue の使い方」）。細かい進み具合は、各 Epic の sub-issue（Task）を見る。

| # | ステップ | 状態 | Epic | 主な PR |
|---|---|---|---|---|
| 0 | 要件定義・git の運用ルール | 完了 | — | [#1](https://github.com/Mika777v/routepense/pull/1)・[#2](https://github.com/Mika777v/routepense/pull/2)・[#4](https://github.com/Mika777v/routepense/pull/4)・[#10](https://github.com/Mika777v/routepense/pull/10) |
| 1 | 雛形（フロントとバックが動く） | 完了 | — | [#3](https://github.com/Mika777v/routepense/pull/3) |
| 2 | 共有の型 | 完了 | — | [#5](https://github.com/Mika777v/routepense/pull/5) |
| 3 | ルートの登録 API と画面 | 完了 | [#11](https://github.com/Mika777v/routepense/issues/11) | [#6](https://github.com/Mika777v/routepense/pull/6)・[#7](https://github.com/Mika777v/routepense/pull/7)・[#8](https://github.com/Mika777v/routepense/pull/8)・[#9](https://github.com/Mika777v/routepense/pull/9)・[#30](https://github.com/Mika777v/routepense/pull/30) |
| 4 | 日次記録と一括設定のロジック | **次** | [#12](https://github.com/Mika777v/routepense/issues/12) | |
| 5 | カレンダー入力と一括設定の画面 | 未着手 | [#13](https://github.com/Mika777v/routepense/issues/13) | |
| 6 | 月ごとの一覧と合計 | 未着手 | [#14](https://github.com/Mika777v/routepense/issues/14) | |
| — | MVP の後（経路検索 U1・祝日 U9） | 未着手 | [#15](https://github.com/Mika777v/routepense/issues/15) | |

## 次にやること

1. **新しいセッションで Epic [#12](https://github.com/Mika777v/routepense/issues/12)（ステップ4）を始める。** 最初は [#17](https://github.com/Mika777v/routepense/issues/17)（日次記録のテーブル。DB のスキーマなので確認待ち）と、それに依存しない [#18](https://github.com/Mika777v/routepense/issues/18)・[#19](https://github.com/Mika777v/routepense/issues/19)（純粋関数）を並べて進められる
2. 教科書は第5章まで。次は「純粋関数とテスト（一括設定の対象日の計算）」の章を、#18・#19 と一緒に書く

## 会話で決めたこと（ほかの文書に無いもの）

- **作業ブランチ**: 作業ごとに `feat/...`・`fix/...`・`docs/...` などの新しいブランチを切って push してよい（2026-11-02 にオーナーが許可）
- **見送ったツール**（2026-11-02）: 中身を読んだうえで、次の2つは入れないことにした
  - Ponytail（`DietrichGebert/ponytail`）: 「コードと説明を最小にする」方針が、学習のために理由を添える方針・将来に備えた作り（ユーザーIDなど）とぶつかる
  - Graphify（`Graphify-Labs/graphify`）: ファイルが少ないうちは効果が薄い。ファイルが数百を超えたら考え直す
- **画面のデザイン**（ステップ3）: ルートの一覧は切符（乗車券）に見立てる。色は紺の文字・冷たい灰色の地・淡い緑の切符・深い緑のボタン、文字は BIZ UDPGothic。色と文字は `frontend/src/styles.css` の `:root` にまとめた。次の画面もこの決まりに合わせる
- **画面での入力の判定**: 画面では判定せず、API が返す `fieldErrors` を欄ごとに出す（判定のルールを backend の1か所に置く）。画面のテストは、React を使わない純粋関数と、fetch を差し替えた API の呼び出しで書く（jsdom などの依存は足していない）
- **claude.ai のアカウントのスキル**: 文書作成（docx・pdf・pptx・xlsx）・`skill-creator` はアカウントで有効なので、どのセッションでも使える。リポジトリには入れない
