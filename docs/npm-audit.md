# `npm audit` の警告の調査（2026-11-02）

Task #68（Epic #67）。`npm install` で出る `11 moderate severity vulnerabilities` の原因を調べた記録。

## 結論

- **元は1件だけ**: `minimatch@10.2.6` の [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)（細工したグロブのパターンで処理が重くなる＝サービス拒否。直った版は `11.0.1` 以上）
- 残りの10件は「脆弱な `minimatch` に依存している」という**数え上げ**で、`eslint`・`typescript-eslint` とその仲間（`@eslint/js`・`@typescript-eslint/*`・`@eslint/config-array` など）が並んでいるだけ
- **影響はほぼ無い**: `minimatch` を使うのは lint（開発のときだけ）。アプリ（frontend・backend）の実行時には入らない。グロブのパターンは自分たちが書いた `eslint.config.js` のものだけで、外からの入力は通らない

> 用語: **グロブ** は `src/**/*.ts` のような、ファイル名をまとめて指す書き方。**推移的な依存** は、自分で入れたライブラリが、さらに入れているライブラリ。

## 依存のつながり

```
eslint@10.13.0 ──────────────────────── minimatch@^10.2.5 → 10.2.6（脆弱）
eslint ─ @eslint/config-array@0.23.5 ── minimatch@^10.2.4
typescript-eslint@8.71.2 ─ @typescript-eslint/typescript-estree ── minimatch@^10.2.2
```

`minimatch` の直った版は 11 系だけで、10 系には出ていない。上の3つはどれも `^10` を求めているので、ふつうの `npm install` では 11 にならない。調べた日の最新版（`eslint@10.14.0`・`@typescript-eslint/typescript-estree@8.72.1`・`@eslint/config-array@0.23.5`）も `^10` のまま。`minimatch@11.0.1` は 2026-10-27 に出たばかり。

## `npm audit fix --force` を使わない理由

`npm audit` が出す直し方は `eslint@4.0.0`・`typescript-eslint@8.14.0`・`@eslint/js@9.39.5` への**古い版への戻し**で、意味が無い（`--force` はメジャーの上げ下げも勝手に行う）。

## 直し方の選択肢

| 案 | やること | よい点 | 危うさ |
|---|---|---|---|
| A. 待つ（おすすめ） | 何もしない。`eslint`・`typescript-eslint` が `minimatch@^11` を使う版を出したら、ふつうに更新する | 手を入れない。上流（ライブラリの作者）が確かめた組み合わせになる | 警告はしばらく出続ける |
| B. `overrides` | ルートの `package.json` に `"overrides": { "minimatch": "^11.0.1" }` を書き、推移的な依存を 11 に差し替える | すぐに 0件になる | `eslint` たちが確かめていないメジャー版を押し込む。上流が `^11` に上げたら外し忘れないようにする |
| C. 受け入れる | 警告を知ったうえで放っておく、と決めて記録する | 手間が無い | A と同じ |

案 B は手元で試した: `overrides` を書いて `npm install` すると `found 0 vulnerabilities`・`minimatch@11.0.4` になり、`npm run lint` も通った（Node 22。`minimatch@11` は Node 18・20・22 以上）。試した後は元に戻した。

**おすすめは A。** 影響が lint だけで、直った版が出てから日が浅く、上流が追いつくのを待っても困らないため。B を選ぶ場合は、依存のメジャー更新に当たるので、PR でオーナーの確認を待つ（`CLAUDE.md`「git の運用」4）。

## 決めたこと（2026-11-02）

**A（待つ）に決めた**（オーナーが選んだ）。決めた日の最新版も `eslint@10.14.0` は `minimatch@^10.2.6`、`@typescript-eslint/typescript-estree@8.72.1` は `^10.2.2`、`@eslint/config-array@0.23.5` は `^10.2.4` のまま。`overrides` は書かず、`npm install` の `11 moderate severity vulnerabilities` は出たままにする。

## 次に見直すとき

- `npm view eslint dependencies.minimatch` と `npm view @typescript-eslint/typescript-estree dependencies.minimatch` が `^11` になったら、`eslint`・`typescript-eslint` を更新して `npm audit` を見直す
- 見直すきっかけ: 依存を更新する作業のついで、または新しいセッションで `npm install` したとき。上流が上がっていて警告が消えたら、このファイルと `docs/PROGRESS.md` の「既知の警告」の項を直す
