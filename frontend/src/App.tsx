import { useState } from "react";
import { CalendarPage } from "./calendar/CalendarPage";
import { RoutesPage } from "./routes/RoutesPage";
import "./styles.css";

/** 画面の種類。月次画面（カレンダー）とルートの管理画面を切り替える */
type View = "calendar" | "routes";

const VIEWS: { view: View; label: string }[] = [
  { view: "calendar", label: "月次" },
  { view: "routes", label: "ルート" },
];

export function App() {
  const [view, setView] = useState<View>("calendar");

  return (
    <>
      <header className="app-header">
        <p className="app-title">routepense</p>
        <p className="app-subtitle">通勤ルートと交通費の記録</p>
        <nav className="app-nav" aria-label="画面">
          {VIEWS.map((item) => (
            <button
              key={item.view}
              type="button"
              aria-current={view === item.view ? "page" : undefined}
              onClick={() => setView(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">{view === "calendar" ? <CalendarPage /> : <RoutesPage />}</main>
    </>
  );
}
