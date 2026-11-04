/**
 * 文字列をファイルとして保存させる（ブラウザのダウンロード）。
 * Blob（ファイルの中身を表すオブジェクト）から一時的な URL を作り、見えないリンクを押したことにする。
 * DOM を使うのでテストはせず、中身を作る部分（純粋関数）の方をテストする。
 */
export function downloadText(fileName: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // 保存が始まった後は URL が要らないので消して、メモリを空ける。
  // 押した直後に消すと、ブラウザによっては保存が始まる前に消えてしまうため、少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
