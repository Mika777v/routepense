import type { HealthResponse } from "@routepense/shared";
import { useEffect, useState } from "react";

// backend の /api/health を呼び、つながっているかを表示するだけの最初の画面
type HealthState =
  | { kind: "loading" }
  | { kind: "ok"; health: HealthResponse }
  | { kind: "error"; message: string };

export function App() {
  const [state, setState] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const health = (await res.json()) as HealthResponse;
        setState({ kind: "ok", health });
      })
      .catch((e: unknown) => {
        setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      });
  }, []);

  return (
    <main>
      <h1>routepense</h1>
      {state.kind === "loading" && <p>backend に接続しています…</p>}
      {state.kind === "ok" && <p>backend に接続できました（{state.health.time}）</p>}
      {state.kind === "error" && <p>backend に接続できません: {state.message}</p>}
    </main>
  );
}
