# 困ったときの手順書

エラーや想定外の動きが起きたときに、**症状 → 考えられる原因 → 見る場所**を引くための文書。Epic [#86](https://github.com/Mika777v/routepense/issues/86)。

- 上から「起動」「画面」「API」「経路検索」「CSV」「DB」「型チェック・lint・テスト」「CI」の順に並べた
- 「見る場所」のファイルは、そのメッセージや判定を書いている場所
- 実際に困ったことは、最後の「起きたことの記録」に足す。原因が分かったら、上の表にも足す

## まず見る3か所

どの症状でも、最初に次の3つを見ると、どこで起きているかの見当が付く。

| 見る場所 | 何が分かるか |
|---|---|
| `npm run dev` を動かしているターミナル | `[backend]` の行: backend のエラー（500 のときは中身がここに出る）。`[frontend]` の行: Vite のエラー（`http proxy error` は backend につながらない） |
| ブラウザの開発者ツールの「コンソール」（F12） | 画面（React）の例外。赤い行の一番上を読む |
| 開発者ツールの「ネットワーク」で `/api/...` の行 | API のステータス（400・404・500・502 など）と、応答の本文（`error`・`fieldErrors`） |

## 起動

| 症状 | 考えられる原因 | 見る場所・対処 |
|---|---|---|
| `npm install` で `11 moderate severity vulnerabilities` | 既知（lint だけで使う `minimatch`）。上流の更新を待つと決めた | `docs/npm-audit.md`。`npm audit fix --force` はしない |
| `npm install` で `EBADENGINE` の警告、または起動で `node:sqlite` が無いというエラー | Node.js が古い。`node:sqlite` を使うので 22.13 以上が要る | `node -v`。版は `.nvmrc`（22）と `package.json` の `engines` |
| backend の起動で `ExperimentalWarning: SQLite is an experimental feature` | 正常。`node:sqlite` がまだ試験的な機能なだけ | 対処は不要（ADR-0001） |
| `ポート 3000 はほかのプログラムが使っています` と出て backend が終わる | ポート 3000 を、前に起動した backend など別のプログラムが使っている | ほかのターミナルの `npm run dev` を止める。または `PORT=3001` で起動する（その場合は `frontend/vite.config.ts` の proxy の先も合わせる）。判定は `backend/src/server.ts` |
| frontend が `http://localhost:5174` など、5173 以外で起動した | 5173 を別のもの（前に起動した Vite など）が使っていて、Vite が空いている番号に移った | 表示された URL を開けば動く。気になるなら前の Vite を止める |
| backend のログに `経路検索: 使えない（EKISPERT_API_KEY が無い）` | 正常。キーが無いときは経路検索の欄を出さない | キーを使うときは `docs/ekispert-setup.md` |

## 画面に出るメッセージ

| メッセージ | 考えられる原因 | 見る場所・対処 |
|---|---|---|
| サーバーに接続できません。backend が起動しているか確かめてください | **backend が止まっている**（Vite の proxy が本文の無い 502 を返した）。backend の起動に失敗していることも多い。または通信そのものが失敗した | ターミナルの `[backend]` の行（起動のエラーが出ていないか）。`[frontend]` に `http proxy error ... ECONNREFUSED 127.0.0.1:3000` が出ていれば、backend につながっていない。判定は `frontend/src/api-client.ts` |
| エラーが起きました（HTTP 数字） | 本文が ApiError でない、想定外の応答 | 開発者ツールの「ネットワーク」でその `/api/...` の応答を見る |
| サーバーでエラーが起きました | backend の想定外の例外（500） | **ターミナルの `[backend]` に例外の中身が出る**（`backend/src/app.ts` の `onError`） |
| リクエストを読み取れません | 本文が JSON として読めない（400）。画面から使う限りは起きないはず | `curl` などで手で API を呼んだなら、本文と `Content-Type: application/json` を確かめる |
| 入力に誤りがあります（＋欄の下に赤い文） | API の受け口のバリデーションで弾かれた（400）。欄ごとの理由は `fieldErrors` | 欄の文の元: `backend/src/validation/fields.ts`（文字の長さ・運賃・URL）、一括設定は `backend/src/daily-records/` の検証 |
| ルートが見つかりません | 編集・削除しようとしたルートが、もう無い（別のタブで消したなど。404） | 画面を読み直す。`backend/src/routes/route-router.ts` |
| 選んだルートが見つかりません | 出勤で選んだルートが、もう無い（別のタブで消したなど） | 画面を読み直して選び直す。`backend/src/daily-records/daily-record-router.ts` |
| その日の記録が見つかりません・追加の移動が見つかりません | 消した記録・追加の移動を、もう一度直そうとした（404） | 画面を読み直す。同じファイル |
| 当てはめ中は CSV で保存できません | 正常。一括設定の当てはめ中は保存できない（U10） | 「登録」するか「取り消す」 |
| 未入力の日（N日）は CSV に入りません | 正常。未入力の日には行を作らない（F7） | 必要なら、カレンダーで勤務区分を選んでから保存する |
| 画面が真っ白 | 画面（React）の例外で描画が止まった | 開発者ツールのコンソールの赤い行。`#root が見つかりません` なら `frontend/index.html` が壊れている |

## API のステータス

backend は、失敗を必ず `{ "error": "...", "fieldErrors": [...] }`（`ApiError`。`shared/src/api.ts`）の形で返す。

| ステータス | 意味 | 見る場所 |
|---|---|---|
| 400 | 入力の誤り。`fieldErrors` に欄ごとの理由 | `backend/src/validation/`・各 `*-router.ts` |
| 404 | ルート・記録・追加の移動が無い。経路検索では「経路が見つからない」 | 各 `*-router.ts` |
| 500 | 想定外の例外。本文は「サーバーでエラーが起きました」だけで、中身はターミナルに出る | `backend/src/app.ts` の `onError` |
| 502 | 経路検索で、駅すぱあと API が失敗した（本文に理由）。**本文が JSON でない 502・503・504 は Vite の proxy**（backend が止まっている。画面には「サーバーに接続できません」と出る） | `backend/src/route-search/` |
| 503 | 経路検索のキーが無い | `backend/.env` の `EKISPERT_API_KEY` |

## 経路検索（駅すぱあと API）

| 症状 | 考えられる原因 | 見る場所・対処 |
|---|---|---|
| ルートの画面に「経路を調べる」の欄が無い | キーが無い（正常） | backend のログ。`docs/ekispert-setup.md` |
| 経路検索に失敗しました: 駅すぱあと API がキーを受け付けませんでした | 403。キーの誤り、または申し込みのドメインと違う。**localhost からも 403 になる** | `docs/ekispert-setup.md`「localhost の連絡」 |
| 経路検索に失敗しました: 駅すぱあと API につながりませんでした | ネットワーク（クラウドのセッションなら、許可していないホスト） | `backend/src/route-search/ekispert-route-search.ts` |
| 経路が見つかりませんでした。駅名を確かめてください | 駅名が駅すぱあとの駅に当たらない（API が 400） | 駅名を正式な名前にする（「駅」を付ける・外すなど） |
| 経路検索に失敗しました: 駅すぱあと API の応答を読み取れませんでした | 応答の形が想定と違う（API の仕様が変わったなど） | `ekispert-route-search.ts` の `resourceUri` と、実際の応答 |
| 「経路を調べる」を押しても新しいタブが開かない | ブラウザのポップアップブロック | アドレスバーのブロックの印から許可する |

## CSV

| 症状 | 考えられる原因 | 見る場所・対処 |
|---|---|---|
| Excel で開くと文字化けする | BOM が落ちた（ファイルを別のエディタで保存し直したなど） | 保存し直さずに開く。作り: `shared/src/csv.ts` の `UTF8_BOM` |
| 金額の和が画面の合計と合わない | 起きないはず（テストで確かめている）。合わなければ不具合 | `shared/src/csv.test.ts`「金額の列の和は…一致する」。Bug の Issue にする |
| ある日の行が無い | 在宅・休日で追加の移動が無い日、未入力の日は行を作らない（F7） | 要件定義 F7 |

## DB（記録がおかしい・消えた）

DB は `backend/data/routepense.db`（SQLite。`DB_PATH` で変えられる）。backend の起動で、無ければ作られる。

中身を見るコマンド（`sqlite3` のコマンドが無くても、Node だけで見られる）:

```bash
cd backend && node -e 'const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync("data/routepense.db");console.table(db.prepare("SELECT date, work_kind, route_name FROM daily_records ORDER BY date").all())'
```

テーブルは `routes`・`daily_records`・`extra_trips`（定義は `backend/src/db/migrations.ts`）。

| 症状 | 考えられる原因 | 見る場所・対処 |
|---|---|---|
| 記録が全部消えた | 別の場所の DB を見ている（`DB_PATH` を変えた、別のフォルダで起動した）。新しいセッション（クラウド）では DB は空から始まる | 起動のログの `（DB: ...）` |
| 試しに全部消したい | — | backend を止めて `backend/data/routepense.db` を消す（**元に戻せない**）。次の起動で空の DB が作られる |
| ルートを消したのに、記録にルート名が残る | 正常。記録は作った時点のルートの値をコピーして持つ（U7） | 要件定義 §5 |

## 型チェック・lint・テスト

確認のコマンドは `npm run typecheck && npm run lint && npm run test`。どれで落ちたかを先に見る。

| 症状 | 見る場所 |
|---|---|
| `error TS2322` などの型エラー | 教科書の各章の「よくある間違いと、型エラーの読み方」。例: TS2322（その型には入らない）は第1・2・3・18章、TS2339（そのプロパティは無い）は第2・4・17章、TS18046（`unknown` のまま使った）は第4・17章 |
| lint のエラー | 行の末尾に規則の名前が出る（例: `@typescript-eslint/no-unused-vars`）。設定は `eslint.config.js` |
| テストが落ちた | `Expected` と `Received` の差を見る。1つだけ動かすなら `npx vitest run shared/src/csv.test.ts` |

## CI（PR のチェック）

| 落ちたチェック | 考えられる原因 | 見る場所・対処 |
|---|---|---|
| `conventional-commits` | PR のタイトルの形が違う（type・scope が一覧に無い） | `.github/workflows/pr-title.yml` の `types`・`scopes`。タイトルを直せば再実行される |
| `checks`（Type check / Lint / Test） | 手元で通していない、または手元と Node の版が違う | 落ちたステップのログ。手元で同じコマンドを動かす（CI は `.nvmrc` の版を使う） |
| `ci-ok` | `checks` が失敗かキャンセルになった | `checks` の方を見る |

## 起きたことの記録

実際に困ったことを、日付と一緒に足す（「症状・原因・どうやって分かったか・対処」）。

- 2026-11-04: backend だけを止めて画面を開くと「エラーが起きました（HTTP 502）」と出て、原因が分かりにくい（この文書を書くときに動かして見つけた。[#89](https://github.com/Mika777v/routepense/issues/89) で「サーバーに接続できません」が出るように直した）
- 2026-11-04: backend を2つ起動すると、2つ目もポート 3000 で起動したと出る（同上。Express 5 の `listen` の callback がエラーでも呼ばれるため。[#90](https://github.com/Mika777v/routepense/issues/90) で、ポートが使用中である旨を出して終わるように直した）
