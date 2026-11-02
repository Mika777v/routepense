# 第6章 純粋関数とテスト（一括設定の対象日の計算）

## この章で学ぶこと

1. 純粋関数とは何か、なぜロジックを純粋関数にするのか（引数を書き換えない書き方を含む）
2. Vitest で純粋関数のテストを書く方法（境界の値を選ぶ）
3. 日付を文字列で扱い、タイムゾーンのずれを避ける方法

## 前提知識

- 第1章（tsconfig と `strict`・`noUncheckedIndexedAccess`）、第2章（判別可能なユニオン型）
- Java の JUnit（`@Test`・`assertEquals`）と、副作用の無い `static` メソッド

| | Java（JUnit 5） | TypeScript（Vitest） |
|---|---|---|
| テストのまとまり | クラス（`class BulkTest`） | `describe("bulkTargetDates", () => { ... })` |
| 1つのテスト | `@Test void weekdaysOnly()` | `it("平日のみ", () => { ... })` |
| 値の比べ方 | `assertEquals(expected, actual)` | `expect(actual).toEqual(expected)` |
| 配列・オブジェクトの中身の比較 | `assertEquals`（`equals` を使う） | `toEqual`（中身を比べる）。`toBe` は同じものか（`==` の参照比較に近い） |

## 概念の説明

### 純粋関数

**定義**: 純粋関数（pure function）とは、次の2つを満たす関数です。

1. **同じ引数なら、必ず同じ結果を返す**（今の時刻・乱数・DB の中身など、引数以外のものに左右されない）
2. **外の状態を変えない**（引数を書き換えない・DB に保存しない・画面に出さない）。この「外を変えること」を副作用（side effect）といいます

```ts
// 純粋関数: 引数だけで結果が決まる
function roundTrip(oneWayFare: number): number {
  return oneWayFare * 2;
}

// 純粋ではない: 今日の日付（引数以外のもの）で結果が変わる
function isTodayMonday(): boolean {
  return new Date().getDay() === 1;
}
```

**理由**: 純粋関数は、**引数を渡して結果を見るだけでテストできます**。DB を用意したり、時刻を固定したりする準備が要りません。また、フロントでもバックでも同じように動くので、`shared/` に置いて両方から使えます。
そのため、このプロジェクトでは「一括設定のロジックは純粋関数にしてテストを書く」と決めています（CLAUDE.md「設計方針」）。DB への保存のような副作用は、純粋関数の外（API の処理）に追い出します。

Java でいえば、フィールドを触らない `static` メソッドに近いものです。ただし Java の `static` メソッドでも、`LocalDate.now()` を呼べば純粋ではなくなります。大事なのは「`static` かどうか」ではなく「引数以外に頼らないか」です。

### テストで選ぶ値: 境界の値

**定義**: 境界の値（boundary value）とは、結果の変わり目にあたる入力です。日付なら月末・年末・うるう年の2月29日、期間なら「1日だけ」「0日」などです。

**理由**: 間違いは、変わり目で起きやすいからです。「11月の真ん中の1週間」だけをテストしても、月末の次の日を正しく作れるかは分かりません。

```ts
import { describe, expect, it } from "vitest";

describe("roundTrip", () => {
  it("片道 220 円の往復は 440 円", () => {
    expect(roundTrip(220)).toBe(440);
  });

  it("0 円の往復は 0 円（境界の値）", () => {
    expect(roundTrip(0)).toBe(0);
  });
});
```

### 日付を文字列のまま扱う

**定義**: このプロジェクトでは、日付を `"2026-11-02"` のような文字列（`DateString`）で持ちます。

**理由**: JavaScript の `Date` は「ある瞬間」を表すもので、「日付」ではありません。そのため、動かす環境のタイムゾーンによって、同じ値が違う日付に見えることがあります。

```ts
// 「2026-11-02」は UTC の 0 時として読まれる。
// 日本（UTC+9）では 11/2 の 9 時だが、アメリカ（UTC-5 など）では 11/1 の夜になる
new Date("2026-11-02").getDay(); // 日本では 1（月）、アメリカでは 0（日）
```

曜日を知りたいときは、**UTC で作って UTC で読む**ようにします。こうすると、タイムゾーンを一度も通らないので、どこで動かしても同じ結果になります。

```ts
new Date(Date.UTC(2026, 10, 2)).getUTCDay(); // どこでも 1（月）。月は 0 始まりなので 11月は 10
```

Java でいえば、`java.util.Date` ではなく `LocalDate`（タイムゾーンを持たない日付）を使うのと同じ考え方です。TypeScript（JavaScript）には `LocalDate` に当たる型が標準に無いので、文字列で代わりをしています。

## このプロジェクトでの実例

### 対象日の計算（`shared/src/bulk.ts`）

一括設定で「11月の平日に出勤を当てはめる」とき、どの日が対象かを計算する関数です。

```ts
export function bulkTargetDates(
  input: Pick<BulkInput, "startDate" | "endDate" | "weekdays">,
): DateString[] {
  const result: DateString[] = [];
  // YYYY-MM-DD は桁数がそろっているので、文字列のまま大小を比べられる
  for (let date = input.startDate; date <= input.endDate; date = nextDate(date)) {
    if (input.weekdays.includes(weekdayOf(date))) {
      result.push(date);
    }
  }
  return result;
}
```

- 引数は `BulkInput` のうち、使う3つだけ（`Pick` は、型からプロパティを選び出して新しい型を作る）。勤務区分を渡さなくても呼べるので、テストが短くなります
- `result` は関数の中で作った配列なので、`push` しても外の状態は変わりません。外から見れば純粋関数です
- 入力が正しいか（日付が実在する・同じ月の中・曜日が1つ以上）は、ここでは確かめません。第4章のとおり、**API の受け口**で確かめます

### 曜日と次の日（`shared/src/date.ts`）

```ts
export function weekdayOf(date: DateString): Weekday {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday;
}

export function nextDate(date: DateString): DateString {
  const { year, month, day } = parseDate(date);
  // 日に 32 などはみ出した値を渡しても、Date.UTC が翌月に繰り上げてくれる
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}
```

- `getUTCDay()` の戻り値の型は `number` です。`Weekday`（`0 | 1 | ... | 6`）だと TypeScript には分からないので、`as Weekday` で伝えています。`as` は型チェックを弱めるので、「必ず 0〜6 になる」と言い切れる場所だけで使います
- `toISOString()` は UTC の日時を `"2026-11-03T00:00:00.000Z"` の形で返すので、先頭の10文字が日付です

### テスト（`shared/src/bulk.test.ts`・`shared/src/date.test.ts`）

Issue の完了条件にあった境界の値を、1つずつテストにしています。

| テスト | 確かめること |
|---|---|
| 平日のみ（11/1 日曜〜11/8 日曜） | 土日が除かれる |
| 毎日（11月全体） | 月末の 11/30 まで数える |
| 月・水・金 | 好きな曜日を選べる |
| うるう年の2月 | 2/29 まで数える |
| 開始日と終了日が同じ日 | 1日だけ、または0日 |
| `nextDate("2026-12-31")` | 年をまたいで `"2027-01-01"` になる |

### 上書きの組み立て（`shared/src/bulk-apply.ts`）

対象日が決まったら、既存の記録に勤務区分を重ねます。上書きするのは勤務区分だけで、追加の移動は残します（要件定義 F3）。

```ts
for (const date of [...targetDates].sort()) {
  const current = byDate.get(date);
  if (current === undefined) {
    records.push({ date, workStyle, extraTrips: [] });
    continue;
  }
  overwrittenDates.push(date);
  // ...
  records.push({ date, workStyle, extraTrips: [...current.extraTrips] });
}
```

- `[...targetDates].sort()` は、コピーしてから並べ替えています。`sort()` は配列そのものを書き換えるので、`targetDates.sort()` と書くと、**呼んだ側の配列まで並び順が変わります**（副作用）
- 追加の移動も `[...current.extraTrips]` でコピーしています。返した記録に移動を足しても、元の記録には響きません
- 引数の型を `readonly DateString[]` にしておくと、関数の中で `targetDates.sort()` と書いた時点で型エラーになります（`Property 'sort' does not exist on type 'readonly string[]'`）。「書き換えない」ことを型で約束できます

2つの関数は、次のように組み合わせて使います。どちらも純粋関数なので、DB が無くてもテストできます。

```ts
const result = applyBulk(bulkTargetDates(input), input.workStyle, recordsOfMonth);
// result.overwrittenDates.length が「◯日分を上書きします」の ◯
```

## よくある間違いと、型エラーの読み方

### 1. `split` の結果をそのまま使う（型エラーになる例）

最初は次のように書きました。

```ts
const [year, month, day] = date.split("-").map(Number);
new Date(Date.UTC(year, month - 1, day)); // 型エラー（わざと間違えています）
```

```
error TS18048: 'month' is possibly 'undefined'.
```

「`month` は `undefined` かもしれない」という意味です。tsconfig の `noUncheckedIndexedAccess`（第1章）が有効なので、配列から取り出した値は `number | undefined` になります。`"abc".split("-")` は要素が1つしかないので、2つめ・3つめは本当に `undefined` になり得ます。
このプロジェクトでは、位置で取り出す `slice` を使う `parseDate` 関数にして直しました（`Number(date.slice(5, 7))` は必ず `number`）。

### 2. `getDay()` を使う

`new Date("2026-11-02").getDay()` は、型エラーにはなりません。しかし動かす環境のタイムゾーンで結果が変わります。**型チェックでは見つからない間違い**なので、UTC で作って UTC で読む（`Date.UTC` と `getUTCDay`）と決めておきます。

### 3. 配列の比較に `toBe` を使う

```ts
expect(bulkTargetDates(input)).toBe(["2026-11-02"]); // テストが失敗する
```

`toBe` は「同じもの（同じ参照）か」を比べます。新しく作った配列どうしは、中身が同じでも別のものです。配列やオブジェクトの中身を比べるときは `toEqual` を使います。Java の `==` と `equals` の違いと同じです。

## 練習問題

1. 次の関数は純粋関数ですか。理由も答えてください。
   ```ts
   function addTrip(trips: ExtraTrip[], trip: ExtraTrip): ExtraTrip[] {
     trips.push(trip);
     return trips;
   }
   ```
2. `bulkTargetDates` に、2026年の12月（12/1 火曜〜12/31 木曜）の平日を求めさせると、何日分が返りますか。また、この期間のテストを足すと、今のテストでは確かめていない何が確かめられますか。
3. `weekdayOf` で `as Weekday` を外すと、どんな型エラーになりますか。

## 理解の確認

一括設定のロジックを、DB に保存する処理と分けて純粋関数にしたのはなぜですか。「テスト」という言葉を使って、一言で説明してみてください。

## 解答

1. 純粋関数ではありません。引数の `trips`（外から渡された配列）を `push` で書き換えているので、副作用があります。呼んだ側が持っている配列まで変わってしまいます。純粋にするなら、`return [...trips, trip];` のように新しい配列を作って返します。
2. 23日分です（12月の31日から、土日の8日を引く）。12月は月末の次の日が翌年の1月1日になるので、「開始日〜終了日の範囲で止まり、年をまたいだ日付を含めない」ことが確かめられます。
3. `Type 'number' is not assignable to type 'Weekday'.` になります。`getUTCDay()` の戻り値は `number` で、`number` は `0 | 1 | ... | 6` より広い型なので、そのままでは代入できません。
