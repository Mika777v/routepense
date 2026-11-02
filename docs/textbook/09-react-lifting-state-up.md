# 第9章 state の持ち上げ（親が持ち、子に渡す）

## この章で学ぶこと

1. 2つの部品が同じデータを使うとき、state（部品が覚えている値）を共通の親に置く理由
2. 親から子へは props（部品の引数）で値を渡し、子から親へはコールバック（呼んでもらう関数）で知らせる形
3. state を書き換えるときに、元の配列を変えず新しい配列を作る理由

## 前提知識

- 第5章（React の制御されたフォーム。`useState`）、第8章（`map` と `key`）
- Java の Observer パターン（リスナーを登録して、変化を知らせてもらう）

| | Java（Swing など） | React |
|---|---|---|
| 値の持ち主 | それぞれの部品のフィールド | 一番近い共通の親の state |
| 子から親へ知らせる | リスナー（`addActionListener`）を登録する | 親が関数を props で渡し、子が呼ぶ |
| 画面の更新 | 変わった部品を自分で `repaint` する | 親の state を新しい値にすると、React が子を描き直す |

## 概念の説明

### state の持ち上げ

**定義**: state の持ち上げ（lifting state up）とは、複数の部品が同じ値を使うときに、その値の state を、それらの部品の一番近い共通の親に移すことです。

**理由**: 2つの部品がそれぞれ同じ値の state を持つと、片方を変えたときにもう片方へ写す処理が要り、写し忘れると表示が食い違います。値の持ち主を1つにすれば、食い違いは起きません。

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <Display count={count} />
      <Button onIncrement={() => setCount((c) => c + 1)} />
    </>
  );
}

function Display({ count }: { count: number }) {
  return <p>{count}回</p>;
}

function Button({ onIncrement }: { onIncrement: () => void }) {
  return <button onClick={onIncrement}>増やす</button>;
}
```

- `Display` と `Button` は、どちらも `count` を自分では持ちません
- `Button` は「押された」ことを `onIncrement` で親に知らせるだけです。何を増やすかは親が決めます

### 新しい値を作って渡す

React は、`setXxx` に渡された値が前の値と**同じオブジェクトかどうか**（`Object.is`）で、描き直すかを決めます。配列の中身を `push` などで直接変えても、配列そのものは同じなので、描き直されないことがあります。そこで、元の配列は変えずに、新しい配列を作って渡します。

```ts
// だめな例: 元の配列を変えている（同じ配列のままなので、描き直されないことがある）
records.push(saved);
setRecords(records);

// よい例: 新しい配列を作る
setRecords([...records, saved]);
```

`setXxx((prev) => ...)` のように関数を渡すと、「その時点の最新の値」から新しい値を作れます。保存の結果が返ってくるまでの間に別の更新があっても、取りこぼしません。

## このプロジェクトでの実例

### 記録の一覧は CalendarPage が持つ（`frontend/src/calendar/CalendarPage.tsx`）

月次画面には、記録を**表示する**カレンダー（`MonthCalendar`）と、記録を**保存する**日の編集パネル（`DayPanel`）があります。どちらも同じ「その月の記録の一覧」を使うので、共通の親の `CalendarPage` が state（`load`）として持ちます。

```
CalendarPage（記録の一覧・編集中の日を持つ）
├─ MonthCalendar  ← weeks（記録から作った週の配列）・selectedDate を受け取り、onSelect で押された日を知らせる
└─ DayPanel       ← その日の record を受け取り、onSaved・onCleared で保存の結果を知らせる
```

パネルで保存すると、`DayPanel` は API の結果を `onSaved(record)` で親に渡します。親は一覧を新しい配列に置き換え、それを元にカレンダーが描き直されます。パネルとカレンダーは、お互いを知りません。

### 新しい配列を作る純粋関数（`frontend/src/calendar/day-edit.ts`）

`upsertRecord`（同じ日があれば置き換え、無ければ足す）と `removeRecord`（その日を除く）は、どちらも元の配列を変えずに新しい配列を返します。純粋関数なので、`day-edit.test.ts` で「元の配列は変えない」ことも確かめています。

親では、関数を渡す形の更新で使います。

```ts
setLoad((prev) => (prev.kind === "ok" ? { ...prev, records: update(prev.records) } : prev));
```

`{ ...prev, records: ... }` は、`prev` の項目を写したうえで `records` だけを差し替えた**新しいオブジェクト**です（第7章の「1つの項目だけを差し替える」と同じ考え方を、値で行っています）。

### 子の中だけで使う state は子に置く（`DayPanel.tsx`）

「保存中か」「エラーの文」は、パネルの中だけで使う値なので、`DayPanel` 自身の state にしています。何でも親に持ち上げるのではなく、**使う部品の共通の親**に置くのが決まりです。

別の日を開いたときにエラーの文が残らないよう、親は `<DayPanel key={selectedDate} ...>` と、日付を `key` にしています。`key` が変わると、React は部品を作り直し、子の state も初めからになります（第8章の `key` と同じ仕組みです）。

## よくある間違いと、型エラーの読み方

### 1. 子が親の state を直接変えようとする

子は親の `setLoad` を知りません。props で受け取った値（`record` など）を書き換えても、親の state は変わらず、画面も変わりません。子は、親から受け取ったコールバックを呼んで知らせます。

### 2. コールバックの型が合わない（型エラーになる例）

`DayPanel` の props は `onSaved: (record: DailyRecord) => void` です。引数の型が違う関数を渡すと、型エラーになります。

```tsx
<DayPanel onSaved={(date: string) => setSelectedDate(date)} /* ... */ />
// error TS2322: Type '(date: string) => void' is not assignable to type '(record: DailyRecord) => void'.
//   Types of parameters 'date' and 'record' are incompatible.
//     Type 'DailyRecord' is not assignable to type 'string'.
```

下の行から読むと、「引数 `record` に来る `DailyRecord` を、`string` の `date` として受け取れない」という意味です。

### 3. 配列を直接変えて、画面が変わらない

`prev.records.push(record); return prev;` のように書くと、型エラーにはなりませんが、`prev` と同じオブジェクトを返しているので、React は「変わっていない」と見なします。新しい配列・新しいオブジェクトを返します。

## 練習問題

1. 月次画面に、月の交通費の合計を出す部品 `MonthTotal` を足すとします。合計の元になる記録の一覧を、`MonthTotal` 自身の state にしない方がよいのはなぜですか。
2. 次の `removeRecord` の書き方は、何がまずいですか。
   ```ts
   function removeRecord(records: DailyRecord[], date: string) {
     const i = records.findIndex((r) => r.date === date);
     records.splice(i, 1);
     return records;
   }
   ```
3. `DayPanel` の「保存中か」の state を、`CalendarPage` に持ち上げる必要はありますか。

## 理解の確認

日の編集パネルで保存した結果が、カレンダーにすぐ出るのはなぜですか。「親」「コールバック」という言葉を使って、一言で説明してみてください。

## 解答

1. 記録の一覧は、カレンダーやパネルと同じものだからです。`MonthTotal` が別に持つと、パネルで保存したときに合計だけが古いままになります。`CalendarPage` が持つ一覧から合計を計算して、props で渡します。
2. 元の配列を変えている（`splice`）うえに、同じ配列を返しているので、React が描き直さないことがあります。また、その日が無いと `findIndex` が `-1` を返し、`splice(-1, 1)` で最後の要素を消してしまいます。`records.filter((r) => r.date !== date)` で新しい配列を返します。
3. ありません。保存中かどうかを使うのはパネルの中だけです。カレンダーも使うようになったら（例: 保存中はマスを押せなくする）、そのときに持ち上げます。
