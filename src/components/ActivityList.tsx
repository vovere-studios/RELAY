import { useWorkspace } from "../data/Workspace";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileCheck2, Plus, Send } from "lucide-react";
import type { Activity } from "../domain/types";
import { formatDate } from "../data/selectors";
import { ListRow } from "./ui";
export function ActivityList({ items }: { items: Activity[] }) {
  const { getSupplier } = useWorkspace();
  return (
    <div className="activity-list">
      {items.map((item) => {
        const Icon =
          item.kind === "document"
            ? FileCheck2
            : item.kind === "supplier"
              ? Plus
              : Send;
        return (
          <ListRow key={item.id}>
            <span className="activity-icon">
              <Icon size={17} strokeWidth={1.5} />
            </span>
            <div className="row-copy">
              <strong>{item.title}</strong>
              <Link to={`/app/suppliers/${item.supplierId}`}>
                {getSupplier(item.supplierId)?.supplier.legalName}
                <ArrowUpRight size={12} />
              </Link>
            </div>
            <time dateTime={item.occurredAt}>
              {formatDate(item.occurredAt)}
            </time>
          </ListRow>
        );
      })}
    </div>
  );
}
