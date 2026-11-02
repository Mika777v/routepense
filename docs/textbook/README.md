# routepense で学ぶ TypeScript（教科書）

このアプリを作りながら、TypeScript を学ぶための教科書です。Java の経験がある人向けに書いています。
上から順に読んでください。

| 章 | ファイル | 内容 | 関係するステップ |
|---|---|---|---|
| 1 | [01-tsconfig-and-typecheck.md](01-tsconfig-and-typecheck.md) | tsconfig と型チェック | ステップ1 雛形 |
| 2 | [02-union-types.md](02-union-types.md) | 判別可能なユニオン型 | ステップ2 共有の型 |
| 3 | [03-interface-and-structural-typing.md](03-interface-and-structural-typing.md) | インターフェースと構造的型付け | ステップ3 ルートの保存 |
| 4 | [04-unknown-and-type-guards.md](04-unknown-and-type-guards.md) | unknown と型ガード（入力の境界でのバリデーション） | ステップ3 ルートの API |
| 5 | [05-react-controlled-form.md](05-react-controlled-form.md) | React の制御されたフォーム（keyof と Record） | ステップ3 ルートの管理画面 |
| 6 | [06-pure-functions-and-tests.md](06-pure-functions-and-tests.md) | 純粋関数とテスト（一括設定の対象日の計算） | ステップ4 一括設定のロジック |
| 7 | [07-utility-and-intersection-types.md](07-utility-and-intersection-types.md) | 型から型を作る（Pick・Omit と交差型） | ステップ4 日次記録の API |
| 8 | [08-react-lists-and-keys.md](08-react-lists-and-keys.md) | 配列から画面を作る（map と key） | ステップ5 月のカレンダー |
| 9 | [09-react-lifting-state-up.md](09-react-lifting-state-up.md) | state の持ち上げ（親が持ち、子に渡す） | ステップ5 日の編集パネル |

これから書く予定の章（`terms-memo.md` を材料にします）:

- （次の章は、一括設定のダイアログ（#23）と一緒に決める）

## そのほかのファイル

- [terms-memo.md](terms-memo.md): 要件定義で出てきた用語のメモ（章を書くときの材料）
