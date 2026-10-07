import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Building2, Search, X } from "lucide-react";
import { useWorkspace } from "../data/Workspace";
import { Dialog, Status } from "./ui";

/** One search surface for mouse, touch and keyboard navigation. */
export function WorkspaceSearch() {
  const { supplierRows } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const resultsId = useId();
  const matching = supplierRows.filter(({ supplier }) =>
    `${supplier.legalName} ${supplier.country} ${supplier.category}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const matches = matching.slice(0, 7);
  const selected = Math.min(active, Math.max(0, matches.length - 1));
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = setTimeout(() => input.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open]);
  function visit(id: string) {
    setOpen(false);
    navigate(`/app/suppliers/${id}`);
  }
  return (
    <>
      <button
        aria-label="Find a supplier"
        aria-keyshortcuts="Meta+K Control+K"
        className="workspace-search"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Search size={17} />
        <span>Find a supplier</span>
        <kbd className="search-key">⌘ K</kbd>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Find your next connection."
      >
        <div className="command-search">
          <div className="command-input">
            <Search size={20} />
            <input
              ref={input}
              placeholder="Company, country or category…"
              aria-label="Search your supplier network"
              role="combobox"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={resultsId}
              aria-activedescendant={
                matches.length ? `${resultsId}-${selected}` : undefined
              }
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive(
                    (selected +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      matches.length) %
                      Math.max(1, matches.length),
                  );
                }
                if (event.key === "Enter" && matches[selected]) {
                  event.preventDefault();
                  visit(matches[selected].supplier.id);
                }
              }}
            />
            {query && (
              <button
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setActive(0);
                  input.current?.focus();
                }}
              >
                <X size={17} />
              </button>
            )}
          </div>
          <p className="command-label" aria-live="polite">
            {query
              ? `${matching.length} connection${matching.length === 1 ? "" : "s"}${matching.length > 7 ? " · showing first 7" : " in view"}`
              : "Explore your network"}
          </p>
          <div
            id={resultsId}
            role="listbox"
            aria-label="Supplier search results"
            className="command-results"
          >
            {matches.map(({ supplier, relationship }, i) => (
              <button
                key={supplier.id}
                id={`${resultsId}-${i}`}
                role="option"
                aria-selected={selected === i}
                onClick={() => visit(supplier.id)}
                onPointerMove={() => setActive(i)}
                tabIndex={-1}
              >
                <span className="command-company">
                  <Building2 size={19} />
                </span>
                <span>
                  <strong>{supplier.legalName}</strong>
                  <small>
                    {supplier.country} · {supplier.category}
                  </small>
                </span>
                <Status status={relationship.status} />
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          {!matches.length && (
            <div className="command-empty">
              <Building2 size={26} />
              <strong>No connection found.</strong>
              <p>Try a company name, country or category.</p>
            </div>
          )}
          <div className="command-footer">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> Navigate
            </span>
            <span>
              <kbd>↵</kbd> Open
            </span>
            <span>
              <kbd>esc</kbd> Close
            </span>
          </div>
        </div>
      </Dialog>
    </>
  );
}
