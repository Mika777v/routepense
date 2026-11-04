# ADR（設計の判断の記録）

後から変えにくい判断（データの置き場所・方式の選択など）を、選択肢と理由と一緒に残す。
ADR を追加・変更する PR は、自動マージせずにオーナーが読んでからマージする（`docs/GITHUB_WORKFLOW.md` §4）。

番号は連番。一度決めた ADR は書き換えず、判断を変えるときは新しい番号の ADR を足して、古いほうの「状態」を「置き換え（ADR-xxxx）」にする。

| 番号 | タイトル | 状態 |
|---|---|---|
| [0001](0001-sqlite-driver.md) | SQLite には Node.js 組み込みの node:sqlite を使う | 決定 |
| [0002](0002-route-search.md) | 運賃は手で入れたまま、駅すぱあと API のフリープランで経路の URL を付ける | 提案 |
| [0003](0003-api-docs-openapi.md) | API の仕様書は OpenAPI を手で書き、Swagger UI で見る | 提案 |
