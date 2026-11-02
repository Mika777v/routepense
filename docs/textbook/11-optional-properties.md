# 第11章 任意のプロパティ（`?` と undefined）

## この章で学ぶこと

1. 任意のプロパティ（`purpose?: string`）の意味と、読むときに `undefined` を考える理由
2. `??`（値が無いときの代わり）と `?.`（無ければ先を読まない）の使い方
3. 値があるときだけプロパティを付ける書き方（`...(条件 && { 項目 })`）

## 前提知識

- 第2章（型の絞り込み）、第7章（`Omit` と、オブジェクトの `...`）
- Java の `null` と `Optional<T>`

| | Java | TypeScript |
|---|---|---|
| 値が無いこと | `null`（どの参照型にも入る） | `undefined`。型に書いたときだけ入る |
| 無いかもしれない項目 | フィールドは常にあり、`null` かもしれない | `purpose?: string`（項目そのものが無くてもよい） |
| 無いときの代わりの値 | `Optional.orElse("")` | `trip.purpose ?? ""` |
| 読み忘れの防ぎ方 | 実行時の `NullPointerException` | コンパイル時の型エラー |

## 概念の説明

**定義**: 任意のプロパティ（optional property）とは、名前の後ろに `?` を付けたプロパティです。そのオブジェクトに**無くてもよい**ことを表し、読むと型は `string | undefined` になります。

```ts
type ExtraTrip = {
  from: string;
  to: string;
  /** 目的・メモ（任意） */
  purpose?: string;
};

const trip: ExtraTrip = { from: "中野", to: "新宿" }; // purpose が無くてもよい
```

**理由**: Java では、どの参照型にも `null` が入るので、読み忘れは実行して初めて分かります。TypeScript（`strict` のとき）は、`?` の付いたプロパティを読むと `undefined` かもしれないことを型で示し、確かめずに使うと型エラーにします。

### ?? と ?.

- `a ?? b`: `a` が `undefined`（か `null`）なら `b`、そうでなければ `a`
- `a?.b`: `a` が `undefined`（か `null`）なら、`.b` を読まずに `undefined`

```ts
const text = trip.purpose ?? "";        // string
const length = trip.purpose?.length;    // number | undefined
```

`||` との違い: `""` や `0` も「無い」と見なす `||` と違い、`??` は `undefined` と `null` のときだけ代わりの値を使います。運賃の `0` を「無い」と取り違えないよう、`??` を使います。

### 値があるときだけ、プロパティを付ける

API に送る値では、「項目が無い」と「項目があって中身が `undefined`」を分けたいことがあります。`{ purpose: undefined }` は、`Object.keys` で `purpose` が出てくる（項目がある）からです。そこで、`...`（スプレッド。オブジェクトの項目を広げて写す）と `&&` を組み合わせます。

```ts
const purpose = values.purpose.trim();
const input = {
  from: values.from,
  ...(purpose !== "" && { purpose }), // 空なら false を広げる（何も足さない）
};
```

- 条件が `true` なら `{ purpose }` が広げられ、項目が付きます
- 条件が `false` なら `...false` になり、何も足されません（`false` を広げても項目は増えません）

## このプロジェクトでの実例

### 目的と元のルートは、空なら送らない（`frontend/src/calendar/extra-trip-form.ts` の `toExtraTripInput`）

```ts
return {
  from: values.from,
  // ...
  ...(purpose !== "" && { purpose }),
  ...(values.sourceRouteId !== "" && { sourceRouteId: values.sourceRouteId }),
};
```

フォームの欄は文字列なので、空の欄は `""` です。`ExtraTripInput` の `purpose?` と `sourceRouteId?` は任意なので、空なら項目を付けずに送ります。backend の `parseExtraTripInput` も、同じ書き方で「値があるときだけ」項目を付けています。

### フォームに戻すときは ?? で空の文字列にする（同じファイルの `toExtraTripFormValues`）

```ts
purpose: trip.purpose ?? "",
sourceRouteId: trip.sourceRouteId ?? "",
```

入力欄の `value` には文字列を渡す決まりなので（第5章の制御されたフォーム）、`undefined` を `""` に置き換えます。

### 表示するときは、あるときだけ出す（`frontend/src/calendar/ExtraTrips.tsx`）

```tsx
{trip.purpose && <p className="trip-purpose">{trip.purpose}</p>}
```

`trip.purpose` が `undefined` か `""` なら、何も描きません。

### 祝日の日だけ、祝日名を持たせる（`frontend/src/calendar/month.ts` の `buildCalendar`）

```ts
export type CalendarDay = {
  date: DateString;
  // ……
  /** 祝日なら祝日名（例: 文化の日）。祝日でない日はプロパティごと無い */
  holidayName?: string;
  // ……
};

const holiday = holidayName(date); // string | undefined（第14章）
days.push({
  date,
  // ……
  ...(holiday !== undefined && { holidayName: holiday }),
});
```

祝日は1か月に数日だけなので、ほとんどの日は「祝日名が無い」日です。任意のプロパティにして、祝日の日だけ付けます。表示する側（`MonthCalendar.tsx`）は `day.holidayName !== undefined` で確かめてから出します。テストでは `expect(day).not.toHaveProperty("holidayName")` で、祝日でない日にプロパティが付いていないことを確かめています（下の「よくある間違い」の3）。

## よくある間違いと、型エラーの読み方

### 1. 確かめずに読む（型エラーになる例）

```ts
const n: number = trip.purpose.length;
// error TS18048: 'trip.purpose' is possibly 'undefined'.
```

「`trip.purpose` は undefined かもしれない」という意味です。`trip.purpose?.length ?? 0` のように、無いときの扱いを書きます。

### 2. 任意でない項目を書き忘れる（型エラーになる例）

```ts
const t: ExtraTrip = { purpose: "打合せ" };
// error TS2741: Property 'from' is missing in type '{ purpose: string; }' but required in type 'ExtraTrip'.
```

`?` が付いていない `from` は必ず要ります。エラーの文は「`from` が無い。でも `ExtraTrip` では必須（required）」という意味です（`to` も無いので、`to` についても同じエラーが出ます）。

### 3. `{ purpose: undefined }` と「項目が無い」を同じだと思う

型の上では、どちらも `ExtraTrip` に入れられます（tsconfig の `exactOptionalPropertyTypes` が無効のとき。このプロジェクトは無効です）。ただし `Object.keys` や `"purpose" in trip` の結果が違います。JSON にすると、どちらも `purpose` は出力されません。「無い」ことをはっきりさせたいときは、項目を付けない書き方にします。

## 練習問題

1. `const fare = input.oneWayFare || 100;` と書くと、運賃が `0` 円のときに何が起きますか。`??` ならどうなりますか。
2. 次の `x` の型は何ですか。
   ```ts
   const trip: ExtraTrip = { from: "中野", to: "新宿" };
   const x = trip.purpose?.trim();
   ```
3. `{ from: "a", ...(false && { purpose: "b" }) }` の値は何ですか。

## 理解の確認

`toExtraTripInput` で、空の目的を `purpose: ""` のまま送らず、項目ごと付けないのはなぜですか。「任意」という言葉を使って、一言で説明してみてください。

## 解答

1. `||` は `0` も「無い」と見なすので、`fare` は `100` になってしまいます。`??` は `undefined` と `null` のときだけ代わりの値を使うので、`0` のままです。
2. `string | undefined` です。`purpose` が無ければ `?.` が `trim()` を呼ばずに `undefined` を返し、あれば `trim()` の結果（`string`）になります。
3. `{ from: "a" }` です。`false && {...}` は `false` になり、`...false` は何も足しません。
