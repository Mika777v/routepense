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
| 4 | 日次記録と一括設定のロジック | 完了 | [#12](https://github.com/Mika777v/routepense/issues/12) | [#32](https://github.com/Mika777v/routepense/pull/32)・[#33](https://github.com/Mika777v/routepense/pull/33)・[#34](https://github.com/Mika777v/routepense/pull/34)・[#35](https://github.com/Mika777v/routepense/pull/35)・[#36](https://github.com/Mika777v/routepense/pull/36) |
| 5 | カレンダー入力と一括設定の画面 | 完了 | [#13](https://github.com/Mika777v/routepense/issues/13) | [#38](https://github.com/Mika777v/routepense/pull/38)・[#39](https://github.com/Mika777v/routepense/pull/39)・[#40](https://github.com/Mika777v/routepense/pull/40)・[#41](https://github.com/Mika777v/routepense/pull/41) |
| 6 | 月ごとの一覧と合計 | **次** | [#14](https://github.com/Mika777v/routepense/issues/14) | |
| — | MVP の後（経路検索 U1・祝日 U9） | 未着手 | [#15](https://github.com/Mika777v/routepense/issues/15) | |

## 次にやること

1. **新しいセッションで Epic [#14](https://github.com/Mika777v/routepense/issues/14)（ステップ6）を始める。** Task は [#25](https://github.com/Mika777v/routepense/issues/25)（表表示とカレンダー表示の切り替え・追加の移動の内訳）と [#26](https://github.com/Mika777v/routepense/issues/26)（月の交通費の合計）。#26 は小さく、#25 と触る場所が近いので、#26 → #25 の順が進めやすい
2. 月次画面の作り（ステップ5で作った。`frontend/src/calendar/`）:
   - `CalendarPage.tsx` が、表示中の月・その月の記録の一覧・ルートの一覧・一括設定の当てはめ中の内容（`Draft`）を持つ。表表示もこの記録の一覧を使えば、カレンダーと食い違わない
   - 記録 → 週の配列は `month.ts` の `buildCalendar`、1日の交通費は `shared` の `dailyFare`。未入力の日の数は `countUnentered`（画面の上に出している）
   - 日の編集パネル `DayPanel.tsx`（勤務区分はすぐ保存。当てはめ中は保存せずに当てはめを直す）、一括設定 `BulkDialog.tsx`・`DraftBar.tsx`・`draft.ts`、追加の移動 `ExtraTrips.tsx`・`ExtraTripForm.tsx`
   - API の呼び出しの共通部分は `frontend/src/api-client.ts`（`request`・`ApiResult`）
3. 教科書は第11章まで。次の章は、ステップ6で使う概念（例: `reduce` での集計、表の作り）から選ぶ
4. `npm install` で `moderate severity vulnerabilities` と出る。`npm audit fix --force` はメジャー更新を含むので使わない。直すなら原因を調べる Task を作り、オーナーに確認する

## 会話で決めたこと（ほかの文書に無いもの）

- **作業ブランチ**: 作業ごとに `feat/...`・`fix/...`・`docs/...` などの新しいブランチを切って push してよい（2026-11-02 にオーナーが許可）
- **見送ったツール**（2026-11-02）: 中身を読んだうえで、次の2つは入れないことにした
  - Ponytail（`DietrichGebert/ponytail`）: 「コードと説明を最小にする」方針が、学習のために理由を添える方針・将来に備えた作り（ユーザーIDなど）とぶつかる
  - Graphify（`Graphify-Labs/graphify`）: ファイルが少ないうちは効果が薄い。ファイルが数百を超えたら考え直す
- **画面のデザイン**（ステップ3）: ルートの一覧は切符（乗車券）に見立てる。色は紺の文字・冷たい灰色の地・淡い緑の切符・深い緑のボタン、文字は BIZ UDPGothic。色と文字は `frontend/src/styles.css` の `:root` にまとめた。次の画面もこの決まりに合わせる
- **画面での入力の判定**: 画面では判定せず、API が返す `fieldErrors` を欄ごとに出す（判定のルールを backend の1か所に置く）。画面のテストは、React を使わない純粋関数と、fetch を差し替えた API の呼び出しで書く（jsdom などの依存は足していない）
- **一括設定の API は「下見」と「登録」の2つ**（2026-11-02）: 要件 F3・U4 の「当てはめ → 日ごとに直す → 登録」に合わせる。`BulkInput` の条件（同じ月・曜日1つ以上）は下見の API の受け口で確かめ、登録の API は直した後の日ごとの一覧を受ける。要件定義は変えていない
- **日次記録のスキーマ**（#34 でオーナーが確認）: ルートの値は列に分けて持つ（CHECK で形を保証）、`route_id` に外部キーは張らない（ルートを消しても記録は残す）、追加の移動は足した順に並べる
- **月次画面の作り**（ステップ5）:
  - 週は月曜始まり（平日の出勤と土日の休日が、それぞれ縦にそろう）
  - 未入力は点線の枠と斜線、赤い「未入力」の文字で、休日（地の灰色）と見分ける
  - 本文の最大幅は 72rem（日の編集パネルをカレンダーの横に並べるため。1000px 以下ではパネルを下に出す）
- **一括設定の画面の流れ**（ステップ5）:
  - 当てはめは何回でも重ねられ、同じ日は後の方を使う
  - 当てはめ中は月を切り替えられない（当てはめは表示中の月の中だけのため）
  - 当てはめ中の日の編集パネルは、保存せずに当てはめを直す（「未入力に戻す」の代わりに「この日の当てはめを外す」）。追加の移動は、登録の後に足す・直す
  - 上書きの確認は、ブラウザの confirm ではなく画面の中の帯に出す（追加の移動がある日の一覧を見せるため）
  - 曜日のボタンは、要件の「平日」「毎日」に「土日」「外す」を足した
- **追加の移動のフォーム**（ステップ5）: 新しく足すときは「往復」を選んでおく。ルートから選ぶと区間・交通手段・運賃をコピーし、片道 / 往復と目的は入力中の値を残す
- **claude.ai のアカウントのスキル**: 文書作成（docx・pdf・pptx・xlsx）・`skill-creator` はアカウントで有効なので、どのセッションでも使える。リポジトリには入れない
