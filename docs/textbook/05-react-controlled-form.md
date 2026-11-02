# 第5章 React の制御されたフォーム

## この章で学ぶこと

1. 入力欄の値を React の state に持つ「制御されたコンポーネント」の書き方
2. 「画面の値（文字列）」と「送る値（ドメインの型）」を分け、変換する関数を置く理由
3. `keyof` と `Record` で、欄の名前と、欄ごとのエラーに型を付ける方法

## 前提知識

- 第2章（判別可能なユニオン型）、第4章（入力の境界でのバリデーション）
- React の関数コンポーネントと `useState` の基本（`const [x, setX] = useState(初期値)`）

Java で画面を作るときと比べると、次のように対応します。

| | Java（Spring MVC と Thymeleaf） | TypeScript（React） |
|---|---|---|
| フォームの値を持つ場所 | 送信したときに、フォームの値がクラス（フォームの Bean）に詰められる | 1文字入力するたびに、state（コンポーネントが覚えている値）を更新する |
| 画面への反映 | サーバーが HTML を作り直して返す | state が変わると、React が画面を描き直す |
| エラーの表示 | `BindingResult` を見て、テンプレートで欄の横に出す | API が返したエラーを state に入れ、欄の下に出す |

## 概念の説明

### 制御されたコンポーネント

**定義**: 制御されたコンポーネント（controlled component）とは、入力欄の値を React の state が決め、入力のたびに `onChange` で state を書き換える作り方です。入力欄は「state を映すだけ」になります。

**理由**: 値の持ち主が state の1か所だけになるので、「欄に表示されている値」と「送る値」がずれません。編集するルートの値を欄に入れる・送信のあとに欄を空にする、といった操作も、state を書き換えるだけで済みます。

```tsx
import { useState } from "react";

function NameField() {
  const [name, setName] = useState(""); // 値の持ち主は state
  return (
    <input
      value={name} // 欄は state を映す
      onChange={(e) => setName(e.target.value)} // 入力のたびに state を書き換える
    />
  );
}
```

`value` だけ書いて `onChange` を書き忘れると、何を打っても欄が変わりません（state が変わらないため）。

### 画面の値と、送る値を分ける

**定義**: 入力欄の `value` は、いつも文字列です。運賃のような数の欄も、入力の途中では `""`（空）や `"12a"`（打ち間違い）になります。そのため、**フォーム用の型**（すべての欄が文字列）と、**API に送る型**（運賃は number）を別に用意し、送るときに変換します。

**理由**: フォームの型を `oneWayFare: number` にすると、空欄を表せません。`0` で代用すると「0円」と「未入力」の区別がつかなくなります。型を分けると、「入力の途中の値」と「確定した値」が、型の上で区別できます。

```ts
// フォームの値（画面用）
type FareForm = { oneWayFare: string };
// 送る値（ドメインの型）
type FareInput = { oneWayFare: number };

function toInput(form: FareForm): FareInput {
  const s = form.oneWayFare.trim();
  return { oneWayFare: s === "" ? Number.NaN : Number(s) };
}
```

### keyof と Record で欄に型を付ける

**定義**:
- `keyof T` は、型 `T` のプロパティ名を集めたユニオン型です。`keyof { name: string; from: string }` は `"name" | "from"` になります
- `Record<K, V>` は、キーが `K`、値が `V` のオブジェクトの型です
- `Partial<T>` は、`T` のプロパティをすべて省略できるようにした型です

**理由**: 欄の名前を `string` にすると、`"nmae"` のような打ち間違いを型チェックが見逃します。`keyof` で作った型なら、存在しない欄の名前は型エラーになります。

```ts
type Form = { name: string; from: string };
type Field = keyof Form; // "name" | "from"
type Errors = Partial<Record<Field, string>>; // { name?: string; from?: string }

const errors: Errors = { name: "入力してください" };
const bad: Errors = { nmae: "入力してください" }; // 型エラー（わざと間違えています）
```

Java で言えば、欄の名前を `enum Field { NAME, FROM }` にして `EnumMap<Field, String>` にエラーを持つのに近い考え方です。ただし TypeScript では、フォームの型を変えると `keyof` の結果も自動で変わるので、enum を別に保守する必要がありません。

## このプロジェクトでの実例

### フォームの型と変換の関数（`frontend/src/routes/route-form.ts`）

```ts
export type RouteFormValues = {
  name: string;
  from: string;
  to: string;
  transport: Transport;
  oneWayFare: string; // 画面では文字列
};

export type RouteFormField = keyof RouteFormValues;
export type RouteFormErrors = Partial<Record<RouteFormField, string>>;
```

- `toRouteFormValues(route)`: 編集を始めるとき、登録済みの `Route` をフォームの値にする（運賃を文字列にする）
- `toRouteInput(values)`: 送るとき、フォームの値を `RouteInput` にする（運賃を数にする）
- `toRouteFormErrors(fieldErrors)`: API が返した `fieldErrors`（`shared/src/api.ts`）を、欄ごとの文に振り分ける

これらは React を使わない純粋関数なので、`route-form.test.ts` で画面を動かさずにテストしています。

`toRouteInput` は、運賃が正しいかどうかを判定しません。判定は API（入力の境界。第4章）に任せ、フロントは型を合わせるだけです。こうすると、判定のルールが backend の1か所にまとまり、画面の判定と API の判定が食い違うことがありません。数として読めない運賃は `NaN` になり、`JSON.stringify` で `null` として送られるので、API が「片道運賃は0以上の整数（円）で入力してください」と返します。

### 1つの欄を書き換える関数（`frontend/src/routes/RouteForm.tsx`）

```tsx
function setField<K extends RouteFormField>(field: K, value: RouteFormValues[K]) {
  setValues((prev) => ({ ...prev, [field]: value }));
}

setField("oneWayFare", e.target.value); // OK（string）
setField("transport", "car"); // 型エラー（Transport ではない）
```

- `K extends RouteFormField` は、「`K` は欄の名前のどれか」という制約です（Java の `<K extends Comparable<K>>` と同じ書き方の制約）
- `RouteFormValues[K]` は、欄 `K` の値の型です。`"transport"` なら `Transport`、それ以外なら `string` になります
- `{ ...prev, [field]: value }` は、前の値をコピーして1つの欄だけを替えた、新しいオブジェクトです。React の state は**書き換えずに、新しい値に置き換える**決まりです

### 交通手段の選択肢と表示名

選択肢は `TRANSPORTS`（`shared/src/route.ts`）から作り、表示名は `Record<Transport, string>` に置いています。

```ts
export const TRANSPORT_LABELS: Record<Transport, string> = {
  train: "電車",
  bus: "バス",
  other: "その他",
};
```

`TRANSPORTS` に手段を足すと、`Transport` 型も増えるので、ここに表示名を書き忘れると型エラーになります。

### 編集するルートを替えたら、フォームを作り直す（`RoutesPage.tsx`）

```tsx
<RouteForm key={editing?.id ?? "new"} editing={editing} ... />
```

`useState` の初期値は、コンポーネントが最初に作られたときに1回だけ使われます。別のルートの「編集」を押しても、そのままでは欄の値が入れ替わりません。`key` を変えると、React はそのコンポーネントを捨てて作り直すので、新しい初期値で state が始まります。

## よくある間違いと、型エラーの読み方

### 1. フォームの型で、数の欄を number にする

```ts
type Bad = { oneWayFare: number };
const [v, setV] = useState<Bad>({ oneWayFare: 0 });
<input value={v.oneWayFare} onChange={(e) => setV({ oneWayFare: e.target.value })} />;
// 型エラー（わざと間違えています）:
// Type 'string' is not assignable to type 'number'.
```

「`string` を `number` の場所に入れようとしている」という意味です。`e.target.value` は必ず文字列です。`Number(...)` で毎回変換すると、空欄が `0` になってしまうので、フォームの型は文字列にして、送るときに変換します。

### 2. state を直接書き換える

```ts
values.name = "自宅↔本社"; // 型エラーにはならないが、画面が更新されない
setValues(values); // 同じオブジェクトなので、React は「変わっていない」と判断する
```

React は、前と同じオブジェクトかどうかで変化を見分けます。`{ ...values, name: "..." }` のように、新しいオブジェクトを作って渡します。

### 3. 欄の名前を string にする

```ts
function setField(field: string, value: string) {
  setValues((prev) => ({ ...prev, [field]: value })); // "nmae" も通ってしまう
}
```

`keyof` を使った型にすると、`setField("nmae", ...)` は次の型エラーになります。

```
Argument of type '"nmae"' is not assignable to parameter of type 'keyof RouteFormValues'.
```

「`"nmae"` は、`RouteFormValues` のプロパティ名のどれでもない」という意味です。

## 練習問題

1. `RouteFormValues` に「メモ」（`memo: string`）の欄を足したとします。`RouteFormErrors` の型の定義は書き換える必要がありますか。理由も答えてください。
2. 次のコードは型エラーになります。なぜですか。
   ```ts
   setField("transport", "taxi");
   ```
3. `RouteForm` に `key` を付けずに使うと、「自宅↔本社」を編集しているときに「自宅↔客先A」の「編集」を押しても、欄が「自宅↔本社」のままになります。なぜですか。

## 理解の確認

フォームの型（`RouteFormValues`）と、API に送る型（`RouteInput`）を分けているのはなぜですか。運賃の欄を例に、一言で説明してみてください。

## 解答

1. 書き換える必要はありません。`RouteFormErrors` は `Partial<Record<keyof RouteFormValues, string>>` なので、`RouteFormValues` に欄を足すと、`keyof` の結果に `"memo"` が自動で加わります。
2. `setField` の `K` が `"transport"` に決まるので、2つめの引数の型は `RouteFormValues["transport"]`、つまり `Transport`（`"train" | "bus" | "other"`）になります。`"taxi"` はそのどれでもないので型エラーです。
3. `useState` の初期値は、コンポーネントが最初に作られたときに1回だけ使われるからです。`editing` が変わってもコンポーネントは同じものが使われ続け、state は前の値のままです。`key` を変えると、React はコンポーネントを作り直すので、新しいルートの値で state が始まります。
