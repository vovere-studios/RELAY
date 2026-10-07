import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, FileClock, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "../data/Workspace";
import { daysUntil } from "../data/selectors";
import { Button, Dialog } from "./ui";
import { useFeedback } from "./Feedback";
export function Notifications() {
  const { expiringCertificates, getSupplier, activities } = useWorkspace();
  const items = [
    ...expiringCertificates.map((c) => ({
      id: c.id,
      title: `${c.standard} expires in ${daysUntil(c.validUntil)} days`,
      detail: getSupplier(c.supplierId)?.supplier.legalName || "",
      supplierId: c.supplierId,
      kind: "expiry",
    })),
    ...activities.slice(0, 2).map((a) => ({
      id: a.id,
      title: a.title,
      detail: getSupplier(a.supplierId)?.supplier.legalName || "",
      supplierId: a.supplierId,
      kind: "activity",
    })),
  ];

  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("relay-notifications-read") || "[]",
      );
      return Array.isArray(value)
        ? value.filter((v) => typeof v === "string")
        : [];
    } catch {
      return [];
    }
  });
  const notify = useFeedback();
  const unread = items.filter((i) => !read.includes(i.id)).length;
  function markRead(ids: string[]) {
    const next = [...new Set([...read, ...ids])];
    setRead(next);
    try {
      localStorage.setItem("relay-notifications-read", JSON.stringify(next));
    } catch {}
  }
  return (
    <>
      <button
        className="icon-button notification-trigger"
        aria-label={`Notifications, ${unread} unread`}
        onClick={() => setOpen(true)}
      >
        <Bell size={18} />
        {unread > 0 && <span className="notification-dot" />}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Your network, in motion."
      >
        <div className="notification-heading">
          <span>{unread} unread updates</span>
          <Button
            variant="ghost"
            disabled={!unread}
            onClick={() => {
              markRead(items.map((i) => i.id));
              notify(
                "All caught up.",
                "Notifications marked as read on this browser.",
              );
            }}
          >
            <Check size={14} />
            Mark all as read
          </Button>
        </div>
        <div className="notification-list">
          {items.map((item) => (
            <Link
              key={item.id}
              className={`notification-item ${!read.includes(item.id) ? "unread" : ""}`}
              to={`/app/suppliers/${item.supplierId}?tab=${item.kind === "expiry" ? "Certificates" : "Activity"}`}
              onClick={() => {
                markRead([item.id]);
                setOpen(false);
              }}
            >
              <span className="activity-icon">
                {item.kind === "expiry" ? (
                  <FileClock size={18} />
                ) : (
                  <Bell size={17} />
                )}
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
        <p className="dialog-footnote">
          Example network updates. Read status is saved on this device. Live
          delivery follows the backend connection.
        </p>
      </Dialog>
    </>
  );
}
