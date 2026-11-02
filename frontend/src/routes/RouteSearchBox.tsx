import type { RouteSearchResponse } from "@routepense/shared";
import { useState } from "react";
import { searchRoute } from "./route-search-api";
import { stationQuery, toStationErrors, type StationErrors, type StationValues } from "./route-search-form";

type Props = {
  /** フォームに入っている出発地・到着地。駅の欄が空のときに使う */
  route: StationValues;
  /** 経路が見つかったら呼ぶ。URL の欄に入れるのは親（フォーム）の仕事 */
  onFound: (response: RouteSearchResponse) => void;
};

const noErrors: StationErrors = { other: [] };

/**
 * 「駅すぱあとで経路を見る」の欄とボタン（U1）。
 * API のキーが無い環境では、親がこのコンポーネントを出さない。
 */
export function RouteSearchBox({ route, onFound }: Props) {
  const [stations, setStations] = useState<StationValues>({ from: "", to: "" });
  const [errors, setErrors] = useState<StationErrors>(noErrors);
  const [message, setMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    // ブラウザは、クリックから時間が経ってから開くタブを広告とみなして止める。
    // そこで、API を待つ前（クリックの直後）に空のタブを開いておき、URL が返ったら移動させる
    const tab = window.open("", "_blank");
    setSearching(true);
    setMessage(null);
    const query = stationQuery(stations, route);
    const result = await searchRoute(query.from, query.to);
    setSearching(false);

    if (!result.ok) {
      tab?.close();
      setErrors(result.error.fieldErrors ? toStationErrors(result.error.fieldErrors) : { other: [result.error.error] });
      return;
    }
    setErrors(noErrors);
    onFound(result.value);
    if (tab) {
      // 開いた先のページから、このアプリのタブを操作できないようにする（rel="noopener" と同じ）
      tab.opener = null;
      tab.location.href = result.value.url;
      setMessage("経路のページを新しいタブで開きました。運賃を確かめて、片道運賃の欄に入れてください");
    } else {
      setMessage("新しいタブを開けませんでした。URL の欄の「開く」から開いてください");
    }
  }

  return (
    <fieldset className="field route-search">
      <legend>経路を調べる（駅すぱあと）</legend>
      {errors.other.length > 0 && (
        <div className="form-alert" role="alert">
          {errors.other.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
      <div className="field-pair">
        <div className="field">
          <label htmlFor="search-from">出発駅</label>
          <input
            id="search-from"
            value={stations.from}
            onChange={(e) => setStations((prev) => ({ ...prev, from: e.target.value }))}
            placeholder={route.from.trim() || "中野"}
            aria-invalid={errors.from ? true : undefined}
            aria-describedby={errors.from ? "search-from-error" : undefined}
          />
          {errors.from && (
            <p className="field-error" id="search-from-error">
              {errors.from}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="search-to">到着駅</label>
          <input
            id="search-to"
            value={stations.to}
            onChange={(e) => setStations((prev) => ({ ...prev, to: e.target.value }))}
            placeholder={route.to.trim() || "東京"}
            aria-invalid={errors.to ? true : undefined}
            aria-describedby={errors.to ? "search-to-error" : undefined}
          />
          {errors.to && (
            <p className="field-error" id="search-to-error">
              {errors.to}
            </p>
          )}
        </div>
      </div>
      <p className="field-hint">空なら出発地・到着地で調べます。「自宅」などのときは、最寄りの駅を入れてください。</p>
      <button type="button" onClick={() => void handleSearch()} disabled={searching}>
        {searching ? "調べています…" : "駅すぱあとで経路を見る"}
      </button>
      <p className="notice" role="status">
        {message}
      </p>
    </fieldset>
  );
}
