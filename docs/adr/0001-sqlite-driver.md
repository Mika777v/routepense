# ADR-0001: SQLite には Node.js 組み込みの node:sqlite を使う

- 状態: 決定
- 日付: 2026-11-02

ADR（Architecture Decision Record）は、後から変えにくい設計の判断について、選択肢と理由を残す文書です。

## 背景

CLAUDE.md で、DB は「SQLite（開発用。後で差し替えやすい構成にする）」と決めている。
Node.js から SQLite を使う方法を決める必要がある。

## 選択肢

| | A. `node:sqlite`（Node.js 組み込み） | B. `better-sqlite3` | C. ORM（Prisma・Drizzle など） |
|---|---|---|---|
| 追加の依存 | なし | あり（ネイティブのモジュール） | あり（多い） |
| インストール | 不要 | OS ごとのビルド済みの部品を取得。無ければ C++ のビルドが必要 | ライブラリと、スキーマの生成の手順が増える |
| 安定性 | Node 22 では「実験的」（起動時に警告が出る）。Node 22 LTS の中では API は変わらない | 長く使われていて安定 | 安定 |
| 書き方 | SQL を直接書く（同期 API） | SQL を直接書く（同期 API。A とほぼ同じ） | 型付きのクエリビルダー |
| 学習 | SQL とデータの対応が見える | A と同じ | 便利だが、SQL が隠れる |

## 決定

**A. `node:sqlite` を使う。**

- 依存が増えず、`npm install` でネイティブのビルドに失敗する心配が無い（クラウドのセッション・Codespaces・CI のどれでも同じに動く）
- SQL を直接書くので、学習のときにテーブルと型の対応が見える
- 個人用の開発用 DB で、規模も小さいので、「実験的」の影響は小さい

## 影響

- Node.js は 22.13 以上が必要（`node:sqlite` をフラグなしで使えるのが 22.13 から）。`package.json` の `engines` を `>=22.13.0` にした
- 起動時とテストのときに `ExperimentalWarning: SQLite is an experimental feature` が出る（害は無い）
- DB を使う処理は `RouteRepository` などのインターフェースの後ろに隠す。B や別の DB に替えるときは、そのインターフェースを実装するクラスを足し、組み立ての1か所を差し替えれば済む
- スキーマの変更は `backend/src/db/migrations.ts` に番号付きで足す。適用済みの番号は `PRAGMA user_version` に記録する

## 見直すとき

- `node:sqlite` の API が変わって困ったとき → B に替える（書き方がほぼ同じなので、移行は小さい）
- 複数ユーザー・本番運用をするとき → PostgreSQL などへの移行を、新しい ADR で検討する
