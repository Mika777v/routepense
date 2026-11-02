import type { Route } from "@routepense/shared";
import { useEffect, useState } from "react";
import { RouteForm } from "./RouteForm";
import { RouteTicket } from "./RouteTicket";
import { deleteRoute, listRoutes } from "./routes-api";

/** 一覧の読み込みの状態（判別可能なユニオン型。読み込み中・成功・失敗のどれか1つ） */
type ListState = { kind: "loading" } | { kind: "ok"; routes: Route[] } | { kind: "error"; message: string };

/** ルートの管理画面。左に登録・編集のフォーム、右に登録済みのルートの一覧を置く */
export function RoutesPage() {
  const [list, setList] = useState<ListState>({ kind: "loading" });
  const [editing, setEditing] = useState<Route | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload() {
    const result = await listRoutes();
    setList(result.ok ? { kind: "ok", routes: result.value } : { kind: "error", message: result.error.error });
  }

  useEffect(() => {
    // 画面を開いたときに1回だけ一覧を読む。読み終わる前に画面を閉じたら、結果を捨てる
    let active = true;
    listRoutes().then((result) => {
      if (!active) return;
      setList(result.ok ? { kind: "ok", routes: result.value } : { kind: "error", message: result.error.error });
    });
    return () => {
      active = false;
    };
  }, []);

  function handleSaved(route: Route) {
    setNotice(editing ? `「${route.name}」を保存しました` : `「${route.name}」を登録しました`);
    setEditing(null);
    void reload();
  }

  async function handleDelete(route: Route) {
    if (!window.confirm(`「${route.name}」を削除しますか？\n作成済みの記録の金額と区間は変わりません。`)) {
      return;
    }
    const result = await deleteRoute(route.id);
    if (!result.ok) {
      setNotice(result.error.error);
      return;
    }
    if (editing?.id === route.id) {
      setEditing(null);
    }
    setNotice(`「${route.name}」を削除しました`);
    void reload();
  }

  return (
    <div className="routes-page">
      <section className="routes-form-panel">
        {/* key を変えると React はフォームを作り直すので、編集するルートを切り替えたときに欄の値が入れ替わる */}
        <RouteForm
          key={editing?.id ?? "new"}
          editing={editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      </section>

      <section className="routes-list-panel" aria-labelledby="routes-heading">
        <h2 id="routes-heading">登録済みのルート</h2>
        <p className="notice" role="status">
          {notice}
        </p>
        {list.kind === "loading" && <p className="muted">読み込んでいます…</p>}
        {list.kind === "error" && (
          <p className="form-alert" role="alert">
            {list.message}
          </p>
        )}
        {list.kind === "ok" && list.routes.length === 0 && (
          <p className="muted">まだルートがありません。左のフォームから、よく使う区間を登録してください。</p>
        )}
        {list.kind === "ok" && list.routes.length > 0 && (
          <ul className="tickets">
            {list.routes.map((route) => (
              <RouteTicket
                key={route.id}
                route={route}
                selected={editing?.id === route.id}
                onEdit={(r) => {
                  setNotice(null);
                  setEditing(r);
                }}
                onDelete={(r) => void handleDelete(r)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
