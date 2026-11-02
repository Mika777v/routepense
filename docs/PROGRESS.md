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
| 6 | 月ごとの一覧と合計 | 完了 | [#14](https://github.com/Mika777v/routepense/issues/14) | [#43](https://github.com/Mika777v/routepense/pull/43)・[#44](https://github.com/Mika777v/routepense/pull/44) |
| — | MVP の後: 祝日 U9 | 完了 | [#15](https://github.com/Mika777v/routepense/issues/15) | [#51](https://github.com/Mika777v/routepense/pull/51)・[#52](https://github.com/Mika777v/routepense/pull/52)・[#53](https://github.com/Mika777v/routepense/pull/53)・[#54](https://github.com/Mika777v/routepense/pull/54)・[#55](https://github.com/Mika777v/routepense/pull/55) |
| — | MVP の後: 経路検索 U1 | **作業中**（方針の確認待ち） | [#15](https://github.com/Mika777v/routepense/issues/15) | [#57](https://github.com/Mika777v/routepense/pull/57)（確認待ち） |

## 次にやること

1. **経路検索（U1）は方針を決めた**（Task [#27](https://github.com/Mika777v/routepense/issues/27)）。ADR-0002 と要件定義の PR [#57](https://github.com/Mika777v/routepense/pull/57) が**オーナーの確認待ち**（自動マージは予約していない）。マージされたら、次の順に進める
   - [#58](https://github.com/Mika777v/routepense/issues/58) ルートに `searchUrl` を足す（型・DB・API。DB のスキーマの変更なので `needs-confirm`）
   - [#59](https://github.com/Mika777v/routepense/issues/59) 経路検索のインターフェースと API。最初に駅すぱあとフリープランの仕様書で、ADR-0002「実装の前に確かめること」を確かめる。クラウドのセッションからは `docs.ekispert.com`・`zenn.dev`・`developers.google.com` につながらなかった（ネットワークの設定で許可が要る）
   - [#60](https://github.com/Mika777v/routepense/issues/60) ルートのフォームの画面（#58・#59 の後）
   - オーナーの作業: 駅すぱあと API フリープランの申し込み（<https://api-info.ekispert.com/form/free/>。キーはメールで3営業日以内）。キーが届く前も、キーが無いときの実装で進められる
   - 祝日の一覧は 2026・2027年 だけ。2028年は、内閣府が 2027年2月ごろに春分・秋分の日を決めた後に `shared/src/holidays.ts` と `HOLIDAY_YEARS` に足す
2. 月次画面の作り（`frontend/src/calendar/`）:
   - `CalendarPage.tsx` が、表示中の月・その月の記録の一覧・ルートの一覧・一括設定の当てはめ中の内容（`Draft`）・見せ方（カレンダー / 表）を持つ。カレンダー・表・合計は、どれも「保存済み＋当てはめ中」の同じ記録の一覧から作る
   - 記録 → 週の配列は `month.ts` の `buildCalendar`。表の行は `month-table.ts` の `buildTableRows`（週の配列から作る）。月の合計は `shared` の `monthlyFare`（`MonthTotal.tsx` が表示）
   - 日の編集パネル `DayPanel.tsx`、一括設定 `BulkDialog.tsx`・`DraftBar.tsx`・`draft.ts`、追加の移動 `ExtraTrips.tsx`・`ExtraTripForm.tsx`、表 `MonthTable.tsx`
   - API の呼び出しの共通部分は `frontend/src/api-client.ts`（`request`・`ApiResult`）
3. 教科書は第14章（Map と ReadonlyMap）まで。次の章は、U1 の作業で使う概念から選ぶ
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
- **コードの整形**（ステップ6）: Prettier は入れていない（設定ファイルも無い）。コードは幅120くらいで手で整えている。`npx prettier` を既定の幅（80）で掛けると関係のない行まで折り返すので使わない（#43 で起き、#44 で戻した）
- **月の合計と表表示**（ステップ6）:
  - 合計は1日の交通費（`dailyFare`）の和、追加の移動は合計 − 通常の交通費。各日の金額・内訳の和が、必ず合計と合う
  - 合計はカレンダーの上に出し、当てはめ中は未登録の内容を含むことを添える。未入力の日があれば「合計はまだ確定していません」と赤で出す
  - 表の未入力の日の金額は「—」（0 円と見分ける）。表の日付を押すと、カレンダーと同じ日の編集パネルが開く
- **祝日（U9）の作り**（2026-11-02）:
  - 要件は `docs/requirements.md` の F3・F5・F6 と、決定の記録の U9
  - 一覧は `shared/src/holidays.ts` の `HOLIDAYS`（`ReadonlyMap`。オブジェクトにすると `"constructor"` などを拾うため）。振替休日・国民の休日は、内閣府の「休日」を見分けやすい名前に分けた
  - 一括設定の `skipHolidays` は、型でも API でも必須（省略は 400）。既定値（除く）は画面の `initialBulkForm` の1か所だけに持つ
  - 祝日名は `CalendarDay`・`TableRow` の任意のプロパティ（祝日の日だけ付ける）。勤務区分・土日の色分けは変えない。色は深い緑（`--accent`）
- **経路検索（U1）の方針**（2026-11-02。ADR-0002、#57 で確認待ち）: 有料の API は使わない。運賃は手で入れたまま、駅すぱあと API のフリープランで経路結果のページの URL をルートに付ける（フリープランは運賃の数値を返さない）。経路検索は backend のインターフェースの後ろに置き、キーは backend の環境変数に置く。Google（日本の電車の経路が返らない報告）と ODPT（経路探索が無い）は外した
- **claude.ai のアカウントのスキル**: 文書作成（docx・pdf・pptx・xlsx）・`skill-creator` はアカウントで有効なので、どのセッションでも使える。リポジトリには入れない
