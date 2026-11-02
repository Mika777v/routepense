import { RoutesPage } from "./routes/RoutesPage";
import "./styles.css";

// 今はルートの管理画面だけ。月次画面ができたら、ここで画面を切り替える
export function App() {
  return (
    <>
      <header className="app-header">
        <p className="app-title">routepense</p>
        <p className="app-subtitle">通勤ルートと交通費の記録</p>
      </header>
      <main className="app-main">
        <RoutesPage />
      </main>
    </>
  );
}
