import type { Route } from "@routepense/shared";
import { TRANSPORT_LABELS, formatYen } from "./route-form";

type Props = {
  route: Route;
  /** 今フォームで編集しているルートなら true */
  selected: boolean;
  onEdit: (route: Route) => void;
  onDelete: (route: Route) => void;
};

/** 一覧の1件。切符（乗車券）に見立てて、区間と運賃を大きく見せる */
export function RouteTicket({ route, selected, onEdit, onDelete }: Props) {
  return (
    <li className={selected ? "ticket is-selected" : "ticket"}>
      <div className="ticket-body">
        <p className="ticket-name">
          {route.name}
          <span className="ticket-transport">{TRANSPORT_LABELS[route.transport]}</span>
        </p>
        <p className="ticket-stations">
          <span>{route.from}</span>
          <span className="ticket-arrow" aria-hidden="true">
            ⇄
          </span>
          <span className="sr-only">と</span>
          <span>{route.to}</span>
        </p>
      </div>
      <div className="ticket-stub">
        <p className="ticket-fare">
          <span className="ticket-fare-label">片道</span>
          {formatYen(route.oneWayFare)}
        </p>
        <div className="ticket-actions">
          <button type="button" onClick={() => onEdit(route)}>
            編集
          </button>
          <button type="button" className="danger" onClick={() => onDelete(route)}>
            削除
          </button>
        </div>
      </div>
    </li>
  );
}
