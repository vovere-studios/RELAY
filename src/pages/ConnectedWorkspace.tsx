import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Building2,
  Files,
  LayoutGrid,
  Settings,
  Users,
  Globe,
  Download,
  LogOut,
  RefreshCw,
  Plus,
  Search,
  Check,
  Link2,
  Copy,
  ShieldCheck,
  Bell,
  Menu,
  X,
  Package,
  Activity,
} from "lucide-react";
import { requireSupabase } from "../lib/supabase";
import {
  workspaceAction,
  downloadPrivate,
  privateLink,
  dateLabel,
  errorMessage,
  type Row,
  type Member,
  type SafeInvite,
  type SafeUploadLink,
  type SharedDocument,
} from "../lib/cloud-api";
import { useFeedback } from "../components/Feedback";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  Input,
  Progress,
  Status,
} from "../components/ui";
import { MotionPanel } from "../components/Motion";
import type { Database } from "../lib/database.types";

type Health = Database["public"]["Views"]["relationship_health"]["Row"];
type Data = {
  org: Row<"organizations">;
  organizations: Row<"organizations">[];
  user: User;
  role: string;
  members: Member[];
  suppliers: Row<"suppliers">[];
  documents: Row<"documents">[];
  requests: Row<"data_requests">[];
  health: Health[];
  requirements: Row<"requirements">[];
  certificates: Row<"certificates">[];
  products: Row<"products">[];
  events: Row<"workspace_events">[];
  shares: SharedDocument[];
  sentShares: Row<"document_shares">[];
  invitations: SafeInvite[];
  links: SafeUploadLink[];
  directory: Row<"company_directory"> | null;
  settings: Row<"workspace_settings"> | null;
};
const sections = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "suppliers", label: "Suppliers", icon: Building2 },
  { id: "documents", label: "Documents", icon: Files },
  { id: "requests", label: "Requests", icon: ArrowUpRight },
  { id: "products", label: "Products", icon: Package },
  { id: "directory", label: "Discover companies", icon: Globe },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];
const titles: Record<string, [string, string]> = {
  overview: [
    "Your network. In focus.",
    "Company information, evidence and relationships. Connected.",
  ],
  suppliers: ["Your connections.", "The companies behind your business."],
  documents: [
    "Evidence, together.",
    "Your private documents and files shared with your company.",
  ],
  requests: [
    "A clear next step.",
    "Collect missing information through a secure upload link.",
  ],
  products: [
    "The finer details.",
    "Product information, connected to your suppliers.",
  ],
  directory: [
    "Good companies. Connected.",
    "Find companies that have chosen to appear in Relay.",
  ],
  activity: [
    "Your workspace, in motion.",
    "A shared record of meaningful updates.",
  ],
  team: ["Better, together.", "Invite your team and control company access."],
  settings: [
    "Make it yours.",
    "Company identity, visibility and workspace preferences.",
  ],
};
function field(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
}
function checkResult<T extends { error: unknown }>(result: T) {
  if (result.error) throw result.error;
  return result;
}
const healthStatus = (health?: Health) =>
  health?.status === "complete"
    ? "complete"
    : health?.status === "attention"
      ? "attention"
      : "missing";
export function ConnectedWorkspace() {
  const navigate = useNavigate();
  const notify = useFeedback();
  const [params, setParams] = useSearchParams();
  const view = sections.some((section) => section.id === params.get("view"))
    ? params.get("view")!
    : "overview";
  const orgParam = params.get("org");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<
    | "supplier"
    | "document"
    | "request"
    | "invite"
    | "share"
    | "product"
    | "notifications"
    | null
  >(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string>("");
  const [directory, setDirectory] = useState<Row<"company_directory">[]>([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("Company");
  const generation = useRef(0);
  const loadedOrg = useRef<string | null>(null);
  const manager = !!data && data.role !== "member";
  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(
      !loadedOrg.current || (!!orgParam && loadedOrg.current !== orgParam),
    );
    setError("");
    const client = requireSupabase();
    try {
      const auth = checkResult(await client.auth.getUser());
      if (!auth.data.user) {
        navigate("/login", { replace: true });
        return;
      }
      const user = auth.data.user;
      let organizations =
        checkResult(
          await client.from("organizations").select("*").order("created_at"),
        ).data || [];
      if (!organizations.length) {
        checkResult(
          await client.rpc("create_workspace", {
            company_name: String(
              user.user_metadata.company_name || "My company",
            ),
            full_name: String(user.user_metadata.full_name || ""),
          }),
        );
        organizations =
          checkResult(
            await client.from("organizations").select("*").order("created_at"),
          ).data || [];
      }
      const org =
        organizations.find((company) => company.id === orgParam) ||
        organizations[0];
      if (!org) throw new Error("Your workspace could not be loaded.");
      const members = await workspaceAction<Member[]>("team", {
        organization_id: org.id,
      });
      const role =
        org.owner_id === user.id
          ? "owner"
          : members.find((member) => member.id === user.id)?.role || "member";
      const canManage = role !== "member";
      const results = await Promise.all([
        client
          .from("suppliers")
          .select("*")
          .eq("organization_id", org.id)
          .order("legal_name"),
        client
          .from("documents")
          .select("*")
          .eq("organization_id", org.id)
          .order("uploaded_at", { ascending: false }),
        client
          .from("data_requests")
          .select("*")
          .eq("organization_id", org.id)
          .order("requested_at", { ascending: false }),
        client
          .from("relationship_health")
          .select("*")
          .eq("organization_id", org.id),
        client.from("requirements").select("*").eq("organization_id", org.id),
        client.from("certificates").select("*").eq("organization_id", org.id),
        client.from("products").select("*").eq("organization_id", org.id),
        client
          .from("workspace_events")
          .select("*")
          .eq("organization_id", org.id)
          .order("created_at", { ascending: false })
          .limit(50),
        client
          .from("company_directory")
          .select("*")
          .eq("organization_id", org.id)
          .maybeSingle(),
        client
          .from("workspace_settings")
          .select("*")
          .eq("organization_id", org.id)
          .maybeSingle(),
        canManage
          ? client
              .from("team_invitations")
              .select(
                "id,organization_id,email,role,created_by,created_at,expires_at,revoked_at,accepted_by",
              )
              .eq("organization_id", org.id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        canManage
          ? client
              .from("upload_links")
              .select(
                "id,organization_id,supplier_id,request_id,title,created_by,created_at,expires_at,revoked_at,uploads_used,max_files",
              )
              .eq("organization_id", org.id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        client
          .from("document_shares")
          .select("*")
          .eq("sender_organization_id", org.id)
          .order("shared_at", { ascending: false }),
        workspaceAction<SharedDocument[]>("received_shares", {
          organization_id: org.id,
        }),
        client
          .from("activities")
          .select("*")
          .eq("organization_id", org.id)
          .order("occurred_at", { ascending: false })
          .limit(50),
      ]);
      for (const result of results.slice(0, 13))
        checkResult(result as { error: unknown });
      if (version !== generation.current) return;
      checkResult(results[14]);
      loadedOrg.current = org.id;
      setData({
        org,
        organizations,
        user,
        role,
        members,
        suppliers: results[0].data || [],
        documents: results[1].data || [],
        requests: results[2].data || [],
        health: results[3].data || [],
        requirements: results[4].data || [],
        certificates: results[5].data || [],
        products: results[6].data || [],
        events: [
          ...(results[7].data || []),
          ...(results[14].data || []).map((item) => ({
            id: item.id,
            organization_id: item.organization_id,
            actor_id: item.actor_id,
            title: item.title,
            detail: item.description,
            created_at: item.occurred_at,
          })),
        ]
          .filter(
            (item, index, items) =>
              items.findIndex(
                (other) =>
                  other.title === item.title &&
                  other.created_at === item.created_at,
              ) === index,
          )
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 50),
        directory: results[8].data,
        settings: results[9].data,
        invitations: results[10].data || [],
        links: results[11].data || [],
        sentShares: results[12].data || [],
        shares: results[13],
      });
    } catch (error) {
      if (version === generation.current) setError(errorMessage(error));
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [navigate, orgParam]);
  useEffect(() => {
    void load();
    const {
      data: { subscription },
    } = requireSupabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/login", { replace: true });
    });
    return () => {
      generation.current++;
      subscription.unsubscribe();
    };
  }, [load, navigate]);
  useEffect(() => {
    setQuery("");
    setMenu(false);
    setSelected(null);
    setGenerated("");
  }, [view, orgParam]);
  useEffect(() => {
    if (view !== "directory" && dialog !== "share") return;
    let active = true;
    setDirectoryLoading(true);
    const timer = setTimeout(() => {
      void workspaceAction<Row<"company_directory">[]>("directory", {
        query: directoryQuery,
      })
        .then((rows) => {
          if (active) setDirectory(rows);
        })
        .catch((error) => {
          if (active) setError(errorMessage(error));
        })
        .finally(() => {
          if (active) setDirectoryLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [directoryQuery, view, dialog]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    const before = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const sidebar = document.querySelector<HTMLElement>(".connected-sidebar");
    const controls = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled]),select:not([disabled])",
        ) || [],
      ).filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => controls()[0]?.focus());
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
      if (event.key === "Tab") {
        const nodes = controls();
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
      if (before?.isConnected) before.focus();
    };
  }, [menu]);
  async function action(
    name: string,
    payload: Record<string, string | boolean | null | string[]> = {},
    success = "Changes saved.",
  ) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const result = await workspaceAction(name, {
        organization_id: data.org.id,
        ...payload,
      });
      notify(success);
      await load();
      return result;
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  function openDialog(next: typeof dialog) {
    setError("");
    setGenerated("");
    setDialog(next);
  }
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied.", "Share it with the intended recipient.");
    } catch {
      notify("Select and copy the link.", "Clipboard access is unavailable.");
    }
  }
  async function createLink(
    supplierId: string,
    requestId?: string,
    title = "Send your company documents",
  ) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const result = await workspaceAction<{ token: string }>("upload_link", {
        organization_id: data.org.id,
        supplier_id: supplierId,
        request_id: requestId || null,
        title,
      });
      setGenerated(privateLink("submit", result.token));
      await load();
      notify(
        "Upload link created.",
        "Valid for fourteen days. Up to five documents.",
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function download(path: string, name: string) {
    try {
      await downloadPrivate(path, name);
    } catch (error) {
      notify("Download unavailable.", errorMessage(error));
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const client = requireSupabase();
    try {
      if (dialog === "supplier")
        checkResult(
          await client.rpc("add_supplier_connection", {
            org_id: data.org.id,
            company_name: field(form, "name"),
            country_name: field(form, "country"),
            country_iso: field(form, "code").toUpperCase(),
            supplier_category: field(form, "category"),
            email: field(form, "email"),
          }),
        );
      if (dialog === "request")
        checkResult(
          await client.rpc("prepare_information_request", {
            connection_id: field(form, "connection"),
            request_title: field(form, "title"),
            due_date: field(form, "due"),
          }),
        );
      if (dialog === "document") {
        const file = form.get("file");
        if (
          !(file instanceof File) ||
          !file.size ||
          file.size > 10 * 1024 * 1024 ||
          !["application/pdf", "image/png", "image/jpeg"].includes(file.type)
        )
          throw new Error("Choose a PDF, PNG or JPEG up to 10 MB.");
        const id = crypto.randomUUID();
        const path = `${data.org.id}/${field(form, "supplier")}/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        checkResult(
          await client.storage
            .from("relay-documents")
            .upload(path, file, { contentType: file.type, upsert: false }),
        );
        const saved = await client
          .from("documents")
          .insert({
            id,
            organization_id: data.org.id,
            supplier_id: field(form, "supplier"),
            name: file.name,
            kind: field(form, "kind"),
            mime_type: file.type,
            storage_path: path,
            uploaded_by: data.user.id,
          });
        if (saved.error) {
          await client.storage.from("relay-documents").remove([path]);
          throw saved.error;
        }
      }
      if (dialog === "product")
        checkResult(
          await client
            .from("products")
            .insert({
              organization_id: data.org.id,
              supplier_id: field(form, "supplier"),
              name: field(form, "name"),
              reference: field(form, "reference"),
              material: field(form, "material"),
            }),
        );
      if (dialog === "invite") {
        const result = await workspaceAction<{ token: string }>("invite", {
          organization_id: data.org.id,
          email: field(form, "email"),
          role: field(form, "role"),
        });
        setGenerated(privateLink("join", result.token));
        await load();
        notify(
          "Invitation created.",
          "Copy the invitation link for your colleague.",
        );
        return;
      }
      if (dialog === "share")
        await workspaceAction("share_documents", {
          organization_id: data.org.id,
          recipient_id: field(form, "recipient"),
          document_ids: form.getAll("documents").map(String),
        });
      setDialog(null);
      await load();
      notify(
        dialog === "share"
          ? "Documents shared."
          : dialog === "request"
            ? "Request created."
            : "Saved to your workspace.",
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await action(
      "settings",
      {
        name: field(form, "name"),
        country_code: field(form, "country_code"),
        registration_number: field(form, "registration_number"),
        website: field(form, "website"),
        description: field(form, "description"),
        listed: form.get("listed") === "on",
        email_updates: form.get("email_updates") === "on",
      },
      "Workspace settings saved.",
    );
  }
  async function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !selected) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      checkResult(
        await requireSupabase()
          .from("suppliers")
          .update({
            legal_name: field(form, "name"),
            country: field(form, "country"),
            country_code: field(form, "code").toUpperCase(),
            category: field(form, "category"),
            contact_name: field(form, "contact_name"),
            contact_email: field(form, "contact_email"),
            website: field(form, "website"),
            updated_at: new Date().toISOString(),
            verified_at: null,
          })
          .eq("organization_id", data.org.id)
          .eq("id", selected),
      );
      await load();
      notify("Company information saved.");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    const result = await requireSupabase().auth.signOut();
    if (result.error) setError(result.error.message);
    else navigate("/login");
  }
  const supplier = data?.suppliers.find((company) => company.id === selected);
  const relationship = data?.health.find((row) => row.supplier_id === selected);
  const shownSuppliers =
    data?.suppliers.filter((company) =>
      `${company.legal_name} ${company.country} ${company.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) || [];
  const title = titles[view];
  const generatedCard = generated && (
    <div className="generated-link">
      <strong>Your private link</strong>
      <p>Copy it now. Relay stores only its protected fingerprint.</p>
      <div>
        <Input
          readOnly
          aria-label="Generated private link"
          value={generated}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button variant="secondary" onClick={() => void copy(generated)}>
          <Copy size={16} />
          Copy
        </Button>
      </div>
      <a href={generated} target="_blank" rel="noopener noreferrer">
        Preview the link <ArrowUpRight size={14} />
      </a>
    </div>
  );
  return (
    <div className="app connected-app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside
        role={menu ? "dialog" : undefined}
        aria-modal={menu || undefined}
        aria-label={menu ? "Company navigation" : undefined}
        className={`sidebar connected-sidebar ${menu ? "is-open" : ""}`}
      >
        <div className="brand-row">
          <Link className="wordmark" to="/">
            relay<span>↗</span>
          </Link>
          <Button
            variant="ghost"
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X size={20} />
          </Button>
        </div>
        <label className="connected-org">
          <span className="eyebrow">YOUR COMPANY</span>
          <select
            aria-label="Select company workspace"
            disabled={busy || loading}
            value={data?.org.id || ""}
            onChange={(event) => setParams({ org: event.target.value, view })}
          >
            {data?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.legal_name}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Company workspace navigation">
          {sections.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              to={`/cloud?view=${id}${data ? `&org=${data.org.id}` : ""}`}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => setMenu(false)}
            >
              <Icon size={17} strokeWidth={1.6} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connected-person">
            <span className="user-avatar">
              {data?.user.email?.slice(0, 1).toUpperCase() || "R"}
            </span>
            <div>
              <strong>{data?.user.email || "Your account"}</strong>
              <small>{data?.role || "Company access"}</small>
            </div>
          </div>
          <button className="help-link" onClick={() => void signOut()}>
            Sign out <LogOut size={15} />
          </button>
          <Link className="attribution" to="/app">
            Explore the separate demo <ArrowUpRight size={12} />
          </Link>
        </div>
      </aside>
      {menu && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell" inert={menu}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span className="crumb-separator">/</span>
            <span>
              {sections.find((section) => section.id === view)?.label}
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="icon-button"
              aria-label="Workspace updates"
              onClick={() => openDialog("notifications")}
            >
              <Bell size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Refresh workspace"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw size={17} className={loading ? "is-spinning" : ""} />
            </button>
            <span className="connection-indicator" />
            <span className="demo-label">Private workspace</span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <header className="page-header connected-heading">
            <div>
              <p className="eyebrow">
                {data?.org.legal_name || "YOUR COMPANY WORKSPACE"}
              </p>
              <h1>{title[0]}</h1>
              <p className="page-description">{title[1]}</p>
            </div>
            {manager &&
              [
                "overview",
                "suppliers",
                "documents",
                "requests",
                "products",
                "team",
              ].includes(view) && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    openDialog(
                      view === "documents"
                        ? "document"
                        : view === "requests"
                          ? "request"
                          : view === "team"
                            ? "invite"
                            : view === "products"
                              ? "product"
                              : "supplier",
                    )
                  }
                >
                  <Plus size={16} />
                  {view === "documents"
                    ? "Upload document"
                    : view === "requests"
                      ? "Create request"
                      : view === "team"
                        ? "Invite colleague"
                        : view === "products"
                          ? "Add product"
                          : "Add supplier"}
                </Button>
              )}
          </header>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!data ? (
            loading ? (
              <div className="connected-loading" role="status">
                <span />
                <p>Connecting your workspace…</p>
              </div>
            ) : (
              <EmptyState
                title="We could not open your workspace."
                description="Retry the connection. Your information has not been changed."
                action={<Button onClick={() => void load()}>Try again</Button>}
              />
            )
          ) : (
            <MotionPanel identity={`${data.org.id}-${view}`} compact>
              {view === "overview" && (
                <>
                  <div className="connected-metrics">
                    {[
                      [data.suppliers.length, "Connected companies"],
                      [
                        data.health.filter((row) => row.status === "complete")
                          .length,
                        "Complete profiles",
                      ],
                      [data.documents.length, "Private documents"],
                      [
                        data.requests.filter(
                          (request) => request.status === "open",
                        ).length,
                        "Open requests",
                      ],
                    ].map(([value, label]) => (
                      <div key={label}>
                        <strong>{value}</strong>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="connected-overview-grid">
                    <section className="connected-panel">
                      <div className="connected-panel-heading">
                        <h2>What needs your attention.</h2>
                        <Link to={`/cloud?view=suppliers&org=${data.org.id}`}>
                          All connections <ArrowUpRight size={15} />
                        </Link>
                      </div>
                      {data.health
                        .filter((row) => row.status !== "complete")
                        .slice(0, 5)
                        .map((row) => {
                          const company = data.suppliers.find(
                            (company) => company.id === row.supplier_id,
                          );
                          return (
                            <button
                              className="connected-attention"
                              key={row.id}
                              onClick={() => {
                                setSelected(row.supplier_id);
                                setDetailTab("Requirements");
                              }}
                            >
                              <span className="company-monogram">
                                {company?.legal_name[0]}
                              </span>
                              <span>
                                <strong>{company?.legal_name}</strong>
                                <small>
                                  {row.missing_requirements} requirements
                                  missing
                                </small>
                              </span>
                              <Status status={healthStatus(row)} />
                              <ArrowUpRight size={16} />
                            </button>
                          );
                        })}
                      {!!data.suppliers.length &&
                        data.health.every(
                          (row) => row.status === "complete",
                        ) && (
                          <p className="quiet-note">
                            Every connection is complete. Your network is up to
                            date.
                          </p>
                        )}
                      {!data.suppliers.length && (
                        <EmptyState
                          title="Your first connection."
                          description="Add a supplier or discover a registered company to begin."
                          action={
                            <Link
                              className="button button-secondary"
                              to={`/cloud?view=directory&org=${data.org.id}`}
                            >
                              Discover companies <ArrowUpRight size={15} />
                            </Link>
                          }
                        />
                      )}
                    </section>
                    <section className="connected-panel">
                      <h2>Moving, together.</h2>
                      {data.events.length ? (
                        data.events.slice(0, 5).map((event) => (
                          <div className="connected-event" key={event.id}>
                            <span>
                              <Check size={15} />
                            </span>
                            <div>
                              <strong>{event.title}</strong>
                              <small>{dateLabel(event.created_at)}</small>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="quiet-note">
                          Your workspace activity will appear here as your team
                          makes progress.
                        </p>
                      )}
                      <div className="connected-next">
                        <ShieldCheck size={21} />
                        <strong>Private by company.</strong>
                        <p>
                          Visibility in the directory is optional. Documents are
                          shared only when you choose a recipient.
                        </p>
                        <Link to={`/cloud?view=settings&org=${data.org.id}`}>
                          Review your settings <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {view === "suppliers" && (
                <>
                  <div className="connected-search">
                    <Search size={17} />
                    <Input
                      placeholder="Search company, country or category…"
                      aria-label="Search connected suppliers"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    <span>{shownSuppliers.length} in view</span>
                  </div>
                  <div className="connected-panel connected-list">
                    {shownSuppliers.map((company) => {
                      const health = data.health.find(
                        (row) => row.supplier_id === company.id,
                      );
                      return (
                        <button
                          className="connected-company-row"
                          key={company.id}
                          onClick={() => {
                            setSelected(company.id);
                            setDetailTab("Company");
                          }}
                        >
                          <span className="company-monogram">
                            {company.legal_name[0]}
                          </span>
                          <span className="row-copy">
                            <strong>{company.legal_name}</strong>
                            <small>
                              {company.country} ·{" "}
                              {company.category || "Company information"}
                            </small>
                          </span>
                          <Status status={healthStatus(health)} />
                          <div className="connected-progress">
                            <Progress value={health?.completeness || 0} />
                            <span>{health?.completeness || 0}%</span>
                          </div>
                          <ArrowUpRight size={17} />
                        </button>
                      );
                    })}
                    {!shownSuppliers.length && (
                      <EmptyState
                        title={
                          query
                            ? "No matching connections."
                            : "Your first connection."
                        }
                        description={
                          query
                            ? "Try another name, country or category."
                            : "Add a supplier or discover a registered company."
                        }
                      />
                    )}
                  </div>
                </>
              )}
              {view === "documents" && (
                <>
                  <div className="connected-section-heading">
                    <h2>Your company documents.</h2>
                    {manager && (
                      <Button
                        variant="secondary"
                        disabled={!data.documents.length}
                        onClick={() => openDialog("share")}
                      >
                        Share documents <ArrowUpRight size={16} />
                      </Button>
                    )}
                  </div>
                  <div className="connected-panel connected-list">
                    {data.documents.map((doc) => (
                      <div className="list-row" key={doc.id}>
                        <span className="activity-icon">
                          <Files size={19} />
                        </span>
                        <div className="row-copy">
                          <strong>{doc.name}</strong>
                          <small>
                            {
                              data.suppliers.find(
                                (company) => company.id === doc.supplier_id,
                              )?.legal_name
                            }
                            {doc.submitted_by_name
                              ? ` · Submitted by ${doc.submitted_by_name}`
                              : ""}
                          </small>
                        </div>
                        <Badge>
                          {doc.verification_status === "verified"
                            ? "Reviewed"
                            : "Awaiting review"}
                        </Badge>
                        <Button
                          variant="ghost"
                          aria-label={`Download ${doc.name}`}
                          onClick={() =>
                            void download(doc.storage_path, doc.name)
                          }
                        >
                          <Download size={17} />
                        </Button>
                      </div>
                    ))}
                    {!data.documents.length && (
                      <EmptyState
                        title="Give evidence a place."
                        description="Upload a supplier document or create an upload link to receive files directly."
                      />
                    )}
                  </div>
                  <div className="connected-section-heading">
                    <h2>Shared with your company.</h2>
                  </div>
                  <div className="connected-panel connected-list">
                    {data.shares.map((doc) => (
                      <div className="list-row" key={doc.id}>
                        <div className="row-copy">
                          <strong>{doc.name}</strong>
                          <small>
                            From {doc.sender_name} · {dateLabel(doc.shared_at)}
                          </small>
                        </div>
                        <Button
                          variant="ghost"
                          aria-label={`Download shared ${doc.name}`}
                          onClick={() =>
                            void download(doc.storage_path, doc.name)
                          }
                        >
                          <Download size={17} />
                        </Button>
                      </div>
                    ))}
                    {!data.shares.length && (
                      <p className="quiet-note">
                        Files shared by registered companies will appear here.
                      </p>
                    )}
                  </div>
                  {manager &&
                    data.sentShares.some((share) => !share.revoked_at) && (
                      <section className="connected-panel">
                        <h2>Your active document shares.</h2>
                        {data.sentShares
                          .filter((share) => !share.revoked_at)
                          .map((share) => (
                            <div className="list-row" key={share.id}>
                              <div className="row-copy">
                                <strong>
                                  {
                                    data.documents.find(
                                      (doc) => doc.id === share.document_id,
                                    )?.name
                                  }
                                </strong>
                                <small>
                                  Shared {dateLabel(share.shared_at)}
                                </small>
                              </div>
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() =>
                                  void action(
                                    "revoke_share",
                                    { id: share.id },
                                    "Document access revoked.",
                                  )
                                }
                              >
                                Revoke access
                              </Button>
                            </div>
                          ))}
                      </section>
                    )}
                </>
              )}
              {view === "requests" && (
                <>
                  <p className="quiet-note">
                    Create a request, then generate a private upload link. Your
                    supplier can submit documents without an account.
                  </p>
                  {generatedCard}
                  <div className="connected-panel connected-list">
                    {data.requests.map((request) => {
                      const rel = data.health.find(
                        (row) => row.id === request.relationship_id,
                      );
                      const company = data.suppliers.find(
                        (company) => company.id === rel?.supplier_id,
                      );
                      return (
                        <div
                          className="list-row connected-request-row"
                          key={request.id}
                        >
                          <div className="row-copy">
                            <strong>{request.title}</strong>
                            <small>
                              {company?.legal_name} · Due{" "}
                              {dateLabel(request.due_at)}
                            </small>
                          </div>
                          <Badge>
                            {request.status === "received"
                              ? "Documents received"
                              : "Awaiting response"}
                          </Badge>
                          {manager && company && (
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() =>
                                void createLink(
                                  company.id,
                                  request.id,
                                  request.title,
                                )
                              }
                            >
                              <Link2 size={15} />
                              Create upload link
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {!data.requests.length && (
                      <EmptyState
                        title="A clear next step."
                        description="Request company information and compliance evidence from a supplier."
                      />
                    )}
                  </div>
                  {manager && (
                    <section className="connected-panel">
                      <h2>Upload links.</h2>
                      {data.links.map((link) => (
                        <div className="list-row" key={link.id}>
                          <div className="row-copy">
                            <strong>{link.title}</strong>
                            <small>
                              {link.uploads_used}/{link.max_files} files ·
                              Expires {dateLabel(link.expires_at)}
                            </small>
                          </div>
                          <Badge>
                            {link.revoked_at
                              ? "Revoked"
                              : new Date(link.expires_at) < new Date()
                                ? "Expired"
                                : "Active"}
                          </Badge>
                          {!link.revoked_at && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                void action(
                                  "revoke_link",
                                  { id: link.id },
                                  "Upload link revoked.",
                                )
                              }
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      ))}
                      {!data.links.length && (
                        <p className="quiet-note">
                          Your secure upload links will appear here.
                        </p>
                      )}
                    </section>
                  )}
                </>
              )}
              {view === "products" && (
                <div className="connected-panel connected-list">
                  {data.products.map((product) => (
                    <div className="list-row" key={product.id}>
                      <span className="activity-icon">
                        <Package size={19} />
                      </span>
                      <div className="row-copy">
                        <strong>{product.name}</strong>
                        <small>
                          {
                            data.suppliers.find(
                              (company) => company.id === product.supplier_id,
                            )?.legal_name
                          }{" "}
                          · {product.reference || "No reference"} ·{" "}
                          {product.material || "Material not recorded"}
                        </small>
                      </div>
                    </div>
                  ))}
                  {!data.products.length && (
                    <EmptyState
                      title="Every detail has a place."
                      description="Add product references and material information to a supplier connection."
                    />
                  )}
                </div>
              )}
              {view === "directory" && (
                <>
                  <div className="connected-search">
                    <Search size={17} />
                    <Input
                      value={directoryQuery}
                      onChange={(event) =>
                        setDirectoryQuery(event.target.value)
                      }
                      placeholder="Search registered companies…"
                      aria-label="Search registered companies"
                    />
                  </div>
                  {directoryLoading && (
                    <p role="status" className="quiet-note">
                      Searching the company directory…
                    </p>
                  )}
                  <div className="company-discovery-grid">
                    {directory
                      .filter(
                        (company) => company.organization_id !== data.org.id,
                      )
                      .map((company) => (
                        <article
                          className="connected-panel discovered-company"
                          key={company.organization_id}
                        >
                          <span className="company-monogram">
                            {company.display_name[0]}
                          </span>
                          <h2>{company.display_name}</h2>
                          <p>
                            {company.description ||
                              "Company information, connected through Relay."}
                          </p>
                          <span>
                            {company.country_code || "Registered company"}
                          </span>
                          <Button
                            variant="secondary"
                            disabled={
                              busy ||
                              !manager ||
                              data.suppliers.some(
                                (supplier) =>
                                  supplier.source_organization_id ===
                                  company.organization_id,
                              )
                            }
                            onClick={() =>
                              void action(
                                "connect_company",
                                { company_id: company.organization_id },
                                "Company connected.",
                              )
                            }
                          >
                            {data.suppliers.some(
                              (supplier) =>
                                supplier.source_organization_id ===
                                company.organization_id,
                            )
                              ? "Connected"
                              : "Connect company"}
                            <ArrowUpRight size={15} />
                          </Button>
                        </article>
                      ))}
                  </div>
                  {!directoryLoading &&
                    !directory.some(
                      (company) => company.organization_id !== data.org.id,
                    ) && (
                      <EmptyState
                        title="A network starts with its first companies."
                        description="Only companies that enable directory visibility appear here. You can still add any supplier privately."
                      />
                    )}
                </>
              )}
              {view === "team" && (
                <>
                  <div className="connected-panel connected-list">
                    {data.members.map((member) => (
                      <div className="list-row" key={member.id}>
                        <span className="user-avatar">
                          {(member.full_name || member.email)[0]?.toUpperCase()}
                        </span>
                        <div className="row-copy">
                          <strong>{member.full_name || member.email}</strong>
                          <small>
                            {member.email}
                            {member.id === data.user.id ? " · You" : ""}
                          </small>
                        </div>
                        {data.role === "owner" && member.role !== "owner" ? (
                          <select
                            aria-label={`Role for ${member.email}`}
                            value={member.role}
                            disabled={busy}
                            onChange={(event) =>
                              void action(
                                "member_role",
                                {
                                  user_id: member.id,
                                  role: event.target.value,
                                },
                                "Team role updated.",
                              )
                            }
                          >
                            <option value="member">Member</option>
                            <option value="admin">Administrator</option>
                          </select>
                        ) : (
                          <Badge>{member.role}</Badge>
                        )}
                        {data.role === "owner" && member.role !== "owner" && (
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove ${member.email} from this workspace?`,
                                )
                              )
                                void action(
                                  "member_role",
                                  { user_id: member.id, role: "remove" },
                                  "Team access removed.",
                                );
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {manager && (
                    <section className="connected-panel">
                      <h2>Invitations.</h2>
                      {data.invitations.map((invite) => (
                        <div className="list-row" key={invite.id}>
                          <div className="row-copy">
                            <strong>{invite.email}</strong>
                            <small>
                              {invite.role} · Expires{" "}
                              {dateLabel(invite.expires_at)}
                            </small>
                          </div>
                          <Badge>
                            {invite.accepted_by
                              ? "Accepted"
                              : invite.revoked_at
                                ? "Revoked"
                                : new Date(invite.expires_at) < new Date()
                                  ? "Expired"
                                  : "Pending"}
                          </Badge>
                          {!invite.accepted_by && !invite.revoked_at && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                void action(
                                  "revoke_invite",
                                  { id: invite.id },
                                  "Invitation revoked.",
                                )
                              }
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      ))}
                      {!data.invitations.length && (
                        <p className="quiet-note">
                          Invite a colleague with their work email. They accept
                          through a private link.
                        </p>
                      )}
                    </section>
                  )}
                  <p className="quiet-note">
                    Owners manage access. Administrators manage company
                    information and documents. Members can view their company's
                    information.
                  </p>
                </>
              )}
              {view === "settings" && (
                <form
                  key={data.org.id}
                  className="connected-settings"
                  onSubmit={saveSettings}
                >
                  <section className="connected-panel">
                    <h2>Your company identity.</h2>
                    <p>
                      Keep the information behind your relationships accurate.
                    </p>
                    <div className="form-grid">
                      <label>
                        Legal company name
                        <Input
                          name="name"
                          required
                          maxLength={160}
                          defaultValue={data.org.legal_name}
                          disabled={!manager}
                        />
                      </label>
                      <label>
                        Country code
                        <Input
                          name="country_code"
                          pattern="[A-Za-z]{2}"
                          maxLength={2}
                          defaultValue={data.org.country_code}
                          disabled={!manager}
                          placeholder="AT"
                        />
                      </label>
                      <label>
                        Registration number
                        <Input
                          name="registration_number"
                          maxLength={100}
                          defaultValue={data.org.registration_number}
                          disabled={!manager}
                        />
                      </label>
                      <label>
                        Website
                        <Input
                          name="website"
                          maxLength={255}
                          defaultValue={data.org.website}
                          disabled={!manager}
                        />
                      </label>
                    </div>
                    <label>
                      Company description
                      <textarea
                        name="description"
                        maxLength={1000}
                        defaultValue={data.directory?.description || ""}
                        disabled={!manager}
                        rows={3}
                      />
                    </label>
                  </section>
                  <section className="connected-panel">
                    <h2>Visibility, by choice.</h2>
                    <label className="settings-switch">
                      <span>
                        <strong>Appear in the company directory</strong>
                        <small>
                          Share your company name, country, website and
                          description with registered Relay users. Your
                          documents remain private.
                        </small>
                      </span>
                      <input
                        name="listed"
                        type="checkbox"
                        defaultChecked={data.directory?.listed || false}
                        disabled={!manager}
                      />
                    </label>
                    <label className="settings-switch">
                      <span>
                        <strong>Email updates</strong>
                        <small>
                          Your preference is saved. Email delivery awaits your
                          company's sender configuration.
                        </small>
                      </span>
                      <input
                        name="email_updates"
                        type="checkbox"
                        defaultChecked={data.settings?.email_updates !== false}
                        disabled={!manager}
                      />
                    </label>
                  </section>
                  {manager ? (
                    <Button type="submit" disabled={busy}>
                      {busy ? "Saving…" : "Save settings"}
                      <Check size={16} />
                    </Button>
                  ) : (
                    <p className="quiet-note">
                      An owner or administrator can update company settings.
                    </p>
                  )}
                  <section className="connected-panel">
                    <h2>Your account.</h2>
                    <p>{data.user.email}</p>
                    <Link className="text-link" to="/account-security">
                      Password and account security <ArrowUpRight size={15} />
                    </Link>
                  </section>
                </form>
              )}
              {view === "activity" && (
                <div className="connected-panel">
                  {data.events.length ? (
                    data.events.map((event) => (
                      <div className="connected-event" key={event.id}>
                        <span>
                          <Activity size={16} />
                        </span>
                        <div>
                          <strong>{event.title}</strong>
                          <p>{event.detail}</p>
                          <small>{dateLabel(event.created_at)}</small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="Your progress belongs here."
                      description="Team joins, supplier submissions and shared documents will appear as your workspace grows."
                    />
                  )}
                </div>
              )}
            </MotionPanel>
          )}
        </main>
        <footer className="app-footer">
          <span>Supplier information, connected.</span>
          <span>A product of VOVERE</span>
        </footer>
      </div>
      <Dialog
        open={!!supplier}
        onClose={() => {
          if (!busy) {
            setSelected(null);
            setGenerated("");
          }
        }}
        title={supplier?.legal_name || "Supplier connection"}
      >
        {supplier && data && (
          <>
            <div className="connected-detail-tabs">
              {["Company", "Documents", "Requirements", "Certificates"].map(
                (tab) => (
                  <button
                    key={tab}
                    aria-pressed={detailTab === tab}
                    onClick={() => setDetailTab(tab)}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <MotionPanel identity={`${supplier.id}-${detailTab}`} compact>
              {detailTab === "Company" && (
                <form className="workspace-form" onSubmit={saveSupplier}>
                  <label>
                    Company name
                    <Input
                      name="name"
                      required
                      maxLength={160}
                      defaultValue={supplier.legal_name}
                      disabled={!manager}
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Country
                      <Input
                        name="country"
                        defaultValue={supplier.country}
                        disabled={!manager}
                      />
                    </label>
                    <label>
                      Country code
                      <Input
                        name="code"
                        pattern="[A-Za-z]{2}"
                        maxLength={2}
                        defaultValue={supplier.country_code}
                        disabled={!manager}
                      />
                    </label>
                  </div>
                  <label>
                    Category
                    <Input
                      name="category"
                      defaultValue={supplier.category}
                      disabled={!manager}
                    />
                  </label>
                  <label>
                    Primary contact
                    <Input
                      name="contact_name"
                      defaultValue={supplier.contact_name}
                      disabled={!manager}
                    />
                  </label>
                  <label>
                    Contact email
                    <Input
                      name="contact_email"
                      type="email"
                      defaultValue={supplier.contact_email}
                      disabled={!manager}
                    />
                  </label>
                  <label>
                    Website
                    <Input
                      name="website"
                      defaultValue={supplier.website}
                      disabled={!manager}
                    />
                  </label>
                  {manager && (
                    <Button disabled={busy} type="submit">
                      Save company information <Check size={15} />
                    </Button>
                  )}
                </form>
              )}
              {detailTab === "Documents" && (
                <>
                  <div className="connected-list">
                    {data.documents
                      .filter((doc) => doc.supplier_id === supplier.id)
                      .map((doc) => (
                        <div className="list-row" key={doc.id}>
                          <div className="row-copy">
                            <strong>{doc.name}</strong>
                            <small>
                              {doc.submitted_by_name
                                ? `Submitted by ${doc.submitted_by_name}`
                                : "Company document"}{" "}
                              · {dateLabel(doc.uploaded_at)}
                            </small>
                          </div>
                          <Button
                            variant="ghost"
                            aria-label={`Download ${doc.name}`}
                            onClick={() =>
                              void download(doc.storage_path, doc.name)
                            }
                          >
                            <Download size={16} />
                          </Button>
                        </div>
                      ))}
                  </div>
                  {!data.documents.some(
                    (doc) => doc.supplier_id === supplier.id,
                  ) && <p className="quiet-note">No documents received yet.</p>}
                  {manager && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void createLink(supplier.id)}
                    >
                      Create upload link <Link2 size={16} />
                    </Button>
                  )}
                  {generatedCard}
                </>
              )}
              {detailTab === "Requirements" && (
                <>
                  {data.requirements
                    .filter(
                      (requirement) =>
                        requirement.relationship_id === relationship?.id,
                    )
                    .map((requirement) => (
                      <form
                        className="requirement-review"
                        key={`${requirement.id}-${requirement.status}`}
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          void action(
                            "review_requirement",
                            {
                              id: requirement.id,
                              status:
                                requirement.status === "satisfied"
                                  ? "missing"
                                  : "satisfied",
                              document_id: field(form, "document") || null,
                            },
                            "Requirement updated.",
                          );
                        }}
                      >
                        <div>
                          <strong>{requirement.name}</strong>
                          <Badge>
                            {requirement.status === "satisfied"
                              ? "Complete"
                              : "Missing"}
                          </Badge>
                        </div>
                        {manager && (
                          <>
                            <select
                              name="document"
                              aria-label={`Evidence for ${requirement.name}`}
                              required={
                                requirement.kind === "document" &&
                                requirement.status !== "satisfied"
                              }
                              defaultValue={requirement.document_id || ""}
                            >
                              <option value="">
                                {requirement.kind === "company"
                                  ? "Company information reviewed"
                                  : "Choose supporting evidence"}
                              </option>
                              {data.documents
                                .filter(
                                  (doc) => doc.supplier_id === supplier.id,
                                )
                                .map((doc) => (
                                  <option key={doc.id} value={doc.id}>
                                    {doc.name}
                                  </option>
                                ))}
                            </select>
                            <Button
                              type="submit"
                              variant="secondary"
                              disabled={busy}
                            >
                              {requirement.status === "satisfied"
                                ? "Mark missing"
                                : "Mark complete"}
                              <Check size={15} />
                            </Button>
                          </>
                        )}
                      </form>
                    ))}
                </>
              )}
              {detailTab === "Certificates" && (
                <>
                  {data.certificates
                    .filter((cert) => cert.supplier_id === supplier.id)
                    .map((cert) => (
                      <div className="list-row" key={cert.id}>
                        <div className="row-copy">
                          <strong>{cert.standard}</strong>
                          <small>
                            {cert.issuer} · Valid until{" "}
                            {dateLabel(cert.valid_until)}
                          </small>
                        </div>
                        <Badge>
                          {new Date(cert.valid_until) < new Date()
                            ? "Expired"
                            : "Recorded"}
                        </Badge>
                      </div>
                    ))}
                  <p className="quiet-note">
                    Certificate uploads remain unreviewed until their details
                    and validity have been recorded.
                  </p>
                  {manager && (
                    <CertificateForm
                      data={data}
                      supplierId={supplier.id}
                      saved={load}
                    />
                  )}
                </>
              )}
            </MotionPanel>
          </>
        )}
      </Dialog>
      <Dialog
        open={dialog !== null}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        title={
          dialog === "invite"
            ? "Your next teammate."
            : dialog === "share"
              ? "Share a clearer picture."
              : dialog === "notifications"
                ? "Your workspace updates."
                : dialog === "supplier"
                  ? "Your next connection."
                  : dialog === "product"
                    ? "Every detail has a place."
                    : dialog === "request"
                      ? "Request the information you need."
                      : "Give evidence a place."
        }
      >
        {data &&
          (dialog === "notifications" ? (
            <div>
              {data.events.slice(0, 12).map((event) => (
                <div className="connected-event" key={event.id}>
                  <Bell size={17} />
                  <div>
                    <strong>{event.title}</strong>
                    <small>{dateLabel(event.created_at)}</small>
                  </div>
                </div>
              ))}
              {!data.events.length && (
                <p className="quiet-note">
                  You are all caught up. New workspace activity will appear
                  here.
                </p>
              )}
            </div>
          ) : dialog === "invite" && generated ? (
            generatedCard
          ) : (
            <form className="workspace-form" onSubmit={submit}>
              {dialog === "supplier" ? (
                <>
                  <label>
                    Company name
                    <Input name="name" required maxLength={160} />
                  </label>
                  <div className="form-grid">
                    <label>
                      Country
                      <Input name="country" required maxLength={80} />
                    </label>
                    <label>
                      Country code
                      <Input
                        name="code"
                        required
                        pattern="[A-Za-z]{2}"
                        maxLength={2}
                        placeholder="AT"
                      />
                    </label>
                  </div>
                  <label>
                    Category
                    <Input name="category" maxLength={100} />
                  </label>
                  <label>
                    Contact email
                    <Input name="email" type="email" maxLength={254} />
                  </label>
                </>
              ) : dialog === "invite" ? (
                <>
                  <label>
                    Work email
                    <Input required name="email" type="email" maxLength={254} />
                  </label>
                  <label>
                    Role
                    <select name="role">
                      <option value="member">
                        Member · View company information
                      </option>
                      {data.role === "owner" && (
                        <option value="admin">
                          Administrator · Manage company information
                        </option>
                      )}
                    </select>
                  </label>
                  <p className="quiet-note">
                    The recipient must accept using this confirmed email
                    address. Invitation expires in seven days.
                  </p>
                </>
              ) : dialog === "share" ? (
                <>
                  <label>
                    Recipient company
                    <select name="recipient" required>
                      <option value="">Choose a registered company</option>
                      {directory
                        .filter(
                          (company) => company.organization_id !== data.org.id,
                        )
                        .map((company) => (
                          <option
                            key={company.organization_id}
                            value={company.organization_id}
                          >
                            {company.display_name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <fieldset className="share-document-options">
                    <legend>Choose documents to share</legend>
                    {data.documents.map((doc) => (
                      <label key={doc.id}>
                        <input
                          type="checkbox"
                          name="documents"
                          value={doc.id}
                        />
                        <span>{doc.name}</span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="quiet-note">
                    This grants the selected company's members access to these
                    files. You can revoke access from Documents.
                  </p>
                </>
              ) : dialog === "request" ? (
                <>
                  <label>
                    Supplier
                    <select required name="connection">
                      {data.health.map((row) => (
                        <option key={row.id} value={row.id || ""}>
                          {
                            data.suppliers.find(
                              (company) => company.id === row.supplier_id,
                            )?.legal_name
                          }
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Request title
                    <Input required name="title" maxLength={160} />
                  </label>
                  <label>
                    Due date
                    <Input
                      required
                      name="due"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </label>
                  <p className="quiet-note">
                    After saving, create a private upload link and share it with
                    your supplier.
                  </p>
                </>
              ) : (
                <>
                  <label>
                    Supplier
                    <select required name="supplier">
                      {data.suppliers.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.legal_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {dialog === "product" ? (
                    <>
                      <label>
                        Product name
                        <Input required name="name" maxLength={160} />
                      </label>
                      <label>
                        Reference
                        <Input name="reference" maxLength={100} />
                      </label>
                      <label>
                        Material
                        <Input name="material" maxLength={160} />
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        Document type
                        <select name="kind">
                          <option value="certificate">Certificate</option>
                          <option value="declaration">Declaration</option>
                          <option value="company">Company information</option>
                        </select>
                      </label>
                      <label className="file-drop">
                        PDF, PNG or JPEG · Up to 10 MB
                        <input
                          required
                          name="file"
                          type="file"
                          accept="application/pdf,image/png,image/jpeg"
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={
                  busy ||
                  ((dialog === "document" ||
                    dialog === "request" ||
                    dialog === "product") &&
                    !data.suppliers.length)
                }
              >
                {busy
                  ? "Saving…"
                  : dialog === "invite"
                    ? "Create invitation"
                    : dialog === "share"
                      ? "Share selected documents"
                      : "Save to workspace"}
                <ArrowUpRight size={16} />
              </Button>
            </form>
          ))}
      </Dialog>
    </div>
  );
}
function CertificateForm({
  data,
  supplierId,
  saved,
}: {
  data: Data;
  supplierId: string;
  saved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useFeedback();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = event.currentTarget;
    setBusy(true);
    setError("");
    try {
      const documentId = field(form, "document");
      await workspaceAction("record_certificate", {
        organization_id: data.org.id,
        supplier_id: supplierId,
        document_id: documentId,
        standard: field(form, "standard"),
        issuer: field(form, "issuer"),
        valid_from: field(form, "from"),
        valid_until: field(form, "until"),
      });
      await saved();
      target.reset();
      notify("Certificate details recorded.");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="workspace-form certificate-record-form" onSubmit={submit}>
      <h3>Record certificate details.</h3>
      <label>
        Supporting certificate
        <select name="document" required>
          <option value="">Choose a document</option>
          {data.documents
            .filter(
              (doc) =>
                doc.supplier_id === supplierId && doc.kind === "certificate",
            )
            .map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Standard
        <Input
          required
          name="standard"
          maxLength={100}
          placeholder="ISO 9001"
        />
      </label>
      <label>
        Issuer
        <Input name="issuer" maxLength={160} />
      </label>
      <div className="form-grid">
        <label>
          Valid from
          <Input required type="date" name="from" />
        </label>
        <label>
          Valid until
          <Input required type="date" name="until" />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        Record certificate <Check size={15} />
      </Button>
    </form>
  );
}
