import { Select } from '../components/Select';
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
  Search,
  Check,
  ShieldCheck,
  Bell,
  Menu,
  X,
  Package,
  Activity,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "../lib/theme";
import { ActionButton, ActionIcon, useActionFeedback } from "../components/ActionFeedback";
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
  LoadingIndicator,
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
  view: string;
  listSupplierIds: string[];
  metrics: { suppliers: number; documents: number; complete: number; requests: number };
  total: number;
  detailTotal: number;
  page: number;
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
function actionKey(name: string, payload: Record<string, unknown> = {}) {
  return `${name}:${String(payload.id || payload.company_id || payload.user_id || "")}`;
}
function focusInvalidField(form: HTMLFormElement) {
  requestAnimationFrame(() => {
    const field = form.querySelector<HTMLElement>('.select-trigger[aria-invalid="true"], input:invalid:not([type="hidden"]), textarea:invalid');
    field?.closest("label")?.scrollIntoView({block:"nearest"});
    field?.focus({preventScroll:true});
  });
}
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
  const feedback = useActionFeedback();
  const [layoutSaved, setLayoutSaved] = useState(true);
  const [params, setParams] = useSearchParams();
  const view = sections.some((section) => section.id === params.get("view"))
    ? params.get("view")!
    : "overview";
  const orgParam = params.get("org");
  const page = Math.max(0, Math.min(100000, Math.floor(Number(params.get("page")) || 0)));
  const { preference, resolved, setPreference } = useTheme();
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [detailPage, setDetailPage] = useState(0);
  const [lookupQuery, setLookupQuery] = useState("");
  const [searchTerms, setSearchTerms] = useState({query:"",lookup:""});
  const [refreshing, setRefreshing] = useState(false);
  const [customize,setCustomize] = useState(false);
  const [widgets,setWidgets] = useState<string[]>(["network","attention","activity","privacy"]);
  const requestController = useRef<AbortController | null>(null);
  const currentUser = useRef<User | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [confirmation, setConfirmation] = useState<{id: string; title: string; description: string; label: string; run: () => Promise<unknown>} | null>(null);
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
  const [shareIds,setShareIds] = useState<string[]>([]);
  const [generated, setGenerated] = useState<string>("");
  const [directory, setDirectory] = useState<Row<"company_directory">[]>([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("Company");
  const generation = useRef(0);
  const loadedOrg = useRef<string | null>(null);
  const manager = !!data && data.role !== "member";
  useEffect(()=>{
    if(!data)return;
    try{const value=JSON.parse(localStorage.getItem(`relay-overview-${data.user.id}-${data.org.id}`)||"null");setWidgets(Array.isArray(value)?value.filter(item=>["network","attention","activity","privacy"].includes(item)):["network","attention","activity","privacy"]);}catch{setWidgets(["network","attention","activity","privacy"]);}
  },[data?.org.id,data?.user.id]);
  function updateWidgets(next: string[]) {
    setWidgets(next);
    if (!data) return;
    try {
      localStorage.setItem(`relay-overview-${data.user.id}-${data.org.id}`, JSON.stringify(next));
      setLayoutSaved(true);
    } catch {
      setLayoutSaved(false);
      notify("Layout changed on this page.", "Browser storage is unavailable. This preference will not survive a reload.", "info");
    }
  }
  const load = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const timeout = setTimeout(()=>controller.abort(),12000);
    const version = ++generation.current;
    setLoading(
      !loadedOrg.current || (!!orgParam && loadedOrg.current !== orgParam),
    );
    setRefreshing(true);
    setError("");
    const client = requireSupabase();
    try {
      let user = currentUser.current;
      if (!user) {
        const auth = await client.auth.getUser();
        if (auth.error || !auth.data.user) { navigate("/login", { replace: true }); return; }
        user = auth.data.user;
        currentUser.current = user;
      }
      const payload = { organization_id:orgParam, view, page, query:searchTerms.query, lookup:searchTerms.lookup, selected, detail_page:detailPage, detail_tab:detailTab, dialog };
      let result = checkResult(await client.rpc("relay_workspace_snapshot", {payload}).abortSignal(controller.signal)).data as unknown as Omit<Data,"user"|"view"> & {needs_workspace?:boolean};
      if (result.needs_workspace) {
        checkResult(await client.rpc("create_workspace", {company_name:String(user.user_metadata.company_name || "My company"),full_name:String(user.user_metadata.full_name || "")}));
        result = checkResult(await client.rpc("relay_workspace_snapshot", {payload}).abortSignal(controller.signal)).data as unknown as Omit<Data,"user"|"view">;
      }
      if (version !== generation.current) return;
      loadedOrg.current = result.org.id;
      setData({...result,user,view});
    } catch (error) {
      if (version === generation.current) setError(controller.signal.aborted ? "The connection took too long. Please try again." : errorMessage(error));
    } finally {
      clearTimeout(timeout);
      if (version === generation.current) { setLoading(false); setRefreshing(false); }
    }
  }, [navigate, orgParam, view, page, searchTerms, selected, detailPage, detailTab, dialog]);
  useEffect(() => { void load(); return () => { generation.current++; requestController.current?.abort(); }; }, [load]);
  useEffect(() => {
    const {data:{subscription}} = requireSupabase().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { currentUser.current=null; navigate("/login",{replace:true}); }
      else if (session?.user) currentUser.current=session.user;
    });
    return () => subscription.unsubscribe();
  },[navigate]);
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerms({query,lookup:lookupQuery}),220);
    return () => clearTimeout(timer);
  },[query,lookupQuery]);
  useEffect(() => { setDetailPage(0); },[selected,detailTab]);
  useEffect(() => {
    if (!settingsDirty) return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[settingsDirty]);
  useEffect(() => {
    setQuery("");
    setMenu(false);
    setSelected(null);
    setGenerated("");
    setConfirmation(null);
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
  function invalidForm(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    feedback.fail(id);
    setError("Check the highlighted fields before saving.");
    focusInvalidField(event.currentTarget);
  }
  async function action(
    name: string,
    payload: Record<string, string | boolean | null | string[]> = {},
    success = "Changes saved.",
  ) {
    const feedbackId = actionKey(name, payload);
    if (!data || busy || !feedback.begin(feedbackId)) return;
    setBusy(true);
    setError("");
    try {
      const result = await workspaceAction(name, {
        organization_id: data.org.id,
        ...payload,
      });
      feedback.succeed(feedbackId);
      notify(success);
      await load();
      return result;
    } catch (error) {
      feedback.fail(feedbackId);
      setError(errorMessage(error));
      notify("Changes not saved.", errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }
  function openDialog(next: typeof dialog) {
    feedback.reset("dialog");
    setError("");
    setGenerated("");
    setLookupQuery("");
    setShareIds([]);
    setDialog(next);
  }
  async function copy(url: string) {
    if (!feedback.begin("copy")) return;
    try {
      await navigator.clipboard.writeText(url);
      feedback.succeed("copy");
      notify("Link copied.", "Share it with the intended recipient.");
    } catch {
      feedback.fail("copy");
      notify("Select and copy the link.", "Clipboard access is unavailable.", "info");
    }
  }
  async function createLink(
    supplierId: string,
    requestId?: string,
    title = "Send your company documents",
  ) {
    const feedbackId = `upload-link:${requestId || supplierId}`;
    if (!data || busy || !feedback.begin(feedbackId)) return;
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
      feedback.succeed(feedbackId);
      await load();
      notify(
        "Upload link created.",
        "Valid for fourteen days. Up to five documents.",
      );
    } catch (error) {
      feedback.fail(feedbackId);
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function download(path: string, name: string) {
    try {
      await downloadPrivate(path, name);
    } catch (error) {
      notify("Download unavailable.", errorMessage(error), "error");
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || busy || !feedback.begin("dialog")) return;
    const submittedDialog = dialog;
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
        feedback.succeed("dialog", () => setGenerated(privateLink("join", result.token)));
        void load();
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
          document_ids: shareIds,
        });
      feedback.succeed("dialog", () => setDialog(current => current === submittedDialog ? null : current));
      void load();
      notify(
        submittedDialog === "share"
          ? "Documents shared."
          : submittedDialog === "request"
            ? "Request created."
            : "Saved to your workspace.",
      );
    } catch (error) {
      feedback.fail("dialog");
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await action(
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
    if(saved) setSettingsDirty(false);
  }
  async function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !selected || busy || !feedback.begin("supplier")) return;
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
      feedback.succeed("supplier");
      await load();
      notify("Company information saved.");
    } catch (error) {
      feedback.fail("supplier");
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    if(settingsDirty && !window.confirm("Sign out without saving your company changes?"))return;
    const result = await requireSupabase().auth.signOut();
    if (result.error) setError(result.error.message);
    else navigate("/login");
  }
  const supplier = data?.suppliers.find((company) => company.id === selected);
  const relationship = data?.health.find((row) => row.supplier_id === selected);
  const shownSuppliers = data?.suppliers.filter(company => data.listSupplierIds.includes(company.id)) || [];
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
        <ActionButton variant="secondary" phase={feedback.phase("copy")} label="Copy link" pendingLabel="Copying…" successLabel="Copied" onClick={() => void copy(generated)}/>
      </div>
      <a href={generated} target="_blank" rel="noopener noreferrer">
        Preview the link <ArrowUpRight size={14} />
      </a>
    </div>
  );
  return (
    <div className="app connected-app" onClickCapture={event=>{const link=event.target instanceof Element?event.target.closest("a[href]"):null;if(!settingsDirty || !link || link.getAttribute("href")?.startsWith("#"))return;if(!window.confirm("Leave without saving your company changes?")){event.preventDefault();event.stopPropagation();return;}setSettingsDirty(false);}}>
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
          <Select
            aria-label="Select company workspace"
            disabled={busy || loading}
            value={data?.org.id || ""}
            onChange={(event) => { if(settingsDirty && !window.confirm("Leave without saving your company changes?"))return;setSettingsDirty(false);setParams({ org: event.target.value, view }); }}
          >
            {data?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.legal_name}
              </option>
            ))}
          </Select>
        </label>
        <nav aria-label="Company workspace navigation">
          {sections.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              to={`/cloud?view=${id}${data ? `&org=${data.org.id}` : ""}`}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => { setSettingsDirty(false);setMenu(false); }}
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
            <button className="icon-button" aria-label={`Switch to ${resolved === "light" ? "dark" : "light"} mode`} onClick={()=>setPreference(resolved==="light"?"dark":"light")}>
              {resolved==="light"?<Moon size={18}/>:<Sun size={18}/>}
            </button>
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
              disabled={loading || refreshing}
              onClick={() => void load()}
            >
              <RefreshCw size={17} className={refreshing ? "is-spinning" : ""} />
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
                  <ActionIcon kind={view === "documents" ? "upload" : view === "requests" ? "request" : "add"}/>
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
          {!data || data.view !== view || loading ? (
            loading || refreshing ? (
              <div className="connected-loading" role="status">
                <LoadingIndicator label="Connecting your workspace…" />
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
                  <div className="overview-tools"><span className="quiet-note">Your workspace at a glance.</span><Button variant="ghost" onClick={()=>setCustomize(true)}><ActionIcon kind="adjust"/>Customize overview</Button></div>
                  {widgets.includes("network") && <div className="connected-metrics">
                    {[
                      [data.metrics.suppliers, "Connected companies"],
                      [
                        data.metrics.complete,
                        "Complete profiles",
                      ],
                      [data.metrics.documents, "Private documents"],
                      [
                        data.metrics.requests,
                        "Open requests",
                      ],
                    ].map(([value, label]) => (
                      <div key={label}>
                        <strong>{value}</strong>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>}
                  <div className={`connected-overview-grid ${!widgets.includes("attention") || !widgets.includes("activity") ? "is-single" : ""}`}>
                    {widgets.includes("attention") && <section className="connected-panel">
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
                              <ChevronRight className="attention-chevron" size={17} />
                            </button>
                          );
                        })}
                      {!!data.metrics.suppliers && data.metrics.complete === data.metrics.suppliers && (
                          <p className="quiet-note">
                            Every connection is complete. Your network is up to
                            date.
                          </p>
                        )}
                      {!data.metrics.suppliers && (
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
                    </section>}
                    {widgets.includes("activity") && <section className="connected-panel">
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
                      {widgets.includes("privacy") && <div className="connected-next">
                        <ShieldCheck size={21} />
                        <strong>Private by company.</strong>
                        <p>
                          Visibility in the directory is optional. Documents are
                          shared only when you choose a recipient.
                        </p>
                        <Link to={`/cloud?view=settings&org=${data.org.id}`}>
                          Review your settings <ArrowUpRight size={15} />
                        </Link>
                      </div>}
                    </section>}
                  </div>
                  {!widgets.includes("activity") && widgets.includes("privacy") && <section className="connected-panel"><ShieldCheck size={22}/><h2>Private by company.</h2><p className="quiet-note">Documents are shared only with the companies you choose.</p><Link className="text-link" to={`/cloud?view=settings&org=${data.org.id}`}>Review privacy settings <ArrowUpRight size={15}/></Link></section>}
                  {!widgets.length && <EmptyState title="A little room to focus." description="Choose the information you want to see in your overview." action={<Button variant="secondary" onClick={()=>setCustomize(true)}>Add widgets</Button>}/>}
                </>
              )}
              {refreshing && <div className="workspace-refresh-status"><LoadingIndicator compact label="Updating workspace…"/></div>}
              {view === "suppliers" && (
                <>
                  <div className="connected-search">
                    <Search size={17} />
                    <Input
                      placeholder="Search company, country or category…"
                      aria-label="Search connected suppliers"
                      value={query}
                      onChange={(event) => {setQuery(event.target.value);setParams(previous=>{const next=new URLSearchParams(previous);next.delete("page");return next;},{replace:true});}}
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
                              <ActionButton
                                variant="secondary"
                                disabled={busy}
                                onClick={() =>
                                  void action(
                                    "revoke_share",
                                    { id: share.id },
                                    "Document access revoked.",
                                  )
                                }
                                phase={feedback.phase(actionKey("revoke_share", {id:share.id}))} label="Revoke access" pendingLabel="Updating…" successLabel="Access revoked"/>
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
                            <ActionButton variant="secondary" disabled={busy} label="Create upload link" pendingLabel="Creating…" successLabel="Link created"
                              phase={feedback.phase(`upload-link:${request.id}`)} onClick={()=>void createLink(company.id,request.id,request.title)}/>
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
                            <ActionButton
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                void action(
                                  "revoke_link",
                                  { id: link.id },
                                  "Upload link revoked.",
                                )
                              }
                                phase={feedback.phase(actionKey("revoke_link", {id:link.id}))} label="Revoke" pendingLabel="Updating…" successLabel="Link revoked"/>
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
                    <LoadingIndicator compact label="Searching the company directory…" />
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
                          <ActionButton
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
                            phase={feedback.phase(actionKey("connect_company", {company_id:company.organization_id}))}
                            label={data.suppliers.some(supplier=>supplier.source_organization_id === company.organization_id) ? "Connected" : "Connect company"}
                            pendingLabel="Connecting…" successLabel="Company connected"/>

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
                          <Select
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
                          </Select>
                        ) : (
                          <Badge>{member.role}</Badge>
                        )}
                        {data.role === "owner" && member.role !== "owner" && (
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              const id = actionKey("member_role", {user_id:member.id});
                              feedback.reset(id);
                              setError("");
                              setConfirmation({id,title:"Remove workspace access.",description:`${member.email} will lose access to this company workspace. Their account remains available. You can invite them again later.`,label:"Remove access",run:()=>action("member_role",{user_id:member.id,role:"remove"},"Team access removed.")});
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
                            <ActionButton
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                void action(
                                  "revoke_invite",
                                  { id: invite.id },
                                  "Invitation revoked.",
                                )
                              }
                                phase={feedback.phase(actionKey("revoke_invite", {id:invite.id}))} label="Revoke" pendingLabel="Updating…" successLabel="Invitation revoked"/>
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
                  onChange={()=>{setSettingsDirty(true);feedback.reset("settings:");setError("");}}
                  className="connected-settings"
                  onSubmit={saveSettings}
                  onInvalidCapture={event=>invalidForm(event,"settings:")}
                >
                  <section className="connected-panel settings-appearance">
                    <p className="eyebrow">YOUR EXPERIENCE</p><h2>Light. Dark. Yours.</h2><p>Choose how Relay looks on this device.</p>
                    <div className="theme-options" role="group" aria-label="Workspace appearance">
                      {([{id:"light",label:"Light",icon:Sun},{id:"dark",label:"Dark",icon:Moon},{id:"system",label:"System",icon:Monitor}] as const).map(({id,label,icon:Icon})=><button type="button" key={id} aria-pressed={preference===id} onClick={()=>setPreference(id)}><Icon size={22}/><strong>{label}</strong><small>{id==="system"?"Follow your device":`${label} appearance`}</small></button>)}
                    </div>
                  </section>
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
                          disabled={!manager || busy}
                        />
                      </label>
                      <label>
                        Country code
                        <Input
                          name="country_code"
                          pattern="[A-Za-z]{2}"
                          maxLength={2}
                          defaultValue={data.org.country_code}
                          disabled={!manager || busy}
                          placeholder="AT"
                        />
                      </label>
                      <label>
                        Registration number
                        <Input
                          name="registration_number"
                          maxLength={100}
                          defaultValue={data.org.registration_number}
                          disabled={!manager || busy}
                        />
                      </label>
                      <label>
                        Website
                        <Input
                          name="website"
                          type="url"
                          placeholder="https://your-company.com"
                          maxLength={255}
                          defaultValue={data.org.website}
                          disabled={!manager || busy}
                        />
                      </label>
                    </div>
                    <label>
                      Company description
                      <textarea
                        name="description"
                        maxLength={1000}
                        defaultValue={data.directory?.description || ""}
                        disabled={!manager || busy}
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
                        role="switch"
                        defaultChecked={data.directory?.listed || false}
                        disabled={!manager || busy}
                      />
                    </label>
                    <label className="settings-switch">
                      <span>
                        <strong>Email updates</strong>
                        <small>
                          Save your preference for future workspace updates. Automatic team and supplier emails are not active yet. Sign-in emails are sent separately.
                        </small>
                      </span>
                      <input
                        name="email_updates"
                        type="checkbox"
                        role="switch"
                        defaultChecked={data.settings?.email_updates !== false}
                        disabled={!manager || busy}
                      />
                    </label>
                  </section>
                  {manager ? (
                    <div className="settings-save-actions"><ActionButton type="submit" phase={feedback.phase("settings:")} disabled={busy || !settingsDirty} label={settingsDirty ? "Save changes" : "All changes saved"} successLabel="Changes saved"/>
                      <Button type="button" variant="ghost" disabled={busy || !settingsDirty} onClick={event=>{event.currentTarget.form?.reset();setSettingsDirty(false);feedback.reset("settings:");setError("");}}>Discard changes</Button></div>
                  ) : (
                    <p className="quiet-note">
                      An owner or administrator can update company settings.
                    </p>
                  )}
                  <section className="connected-panel">
                    <h2>Your account.</h2>
                    <div className="settings-account"><span className="user-avatar">{data.user.email?.[0]?.toUpperCase()}</span><div><strong>{data.user.email}</strong><small>{data.role === "owner" ? "Company workspace owner" : data.role === "admin" ? "Company administrator" : "Workspace member"}</small></div><Badge>{data.user.email_confirmed_at?"Email verified":"Email unconfirmed"}</Badge></div><p>Your company role controls access to this workspace. It does not grant RELAY platform administration.</p>
                    <Link className="text-link" to="/account-security">
                      Sign-in and account security <ArrowUpRight size={15} />
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
              {["suppliers","documents","requests","products","team","activity"].includes(view) && data.total>50 && <PageControls page={page} total={data.total} busy={refreshing} onChange={next=>setParams({view,org:data.org.id,page:String(next)})}/>}
            </MotionPanel>
          )}
        </main>
        <footer className="app-footer">
          <span>Supplier information, connected.</span>
          <span>A product of VOVERE</span>
        </footer>
      </div>
      <Dialog closeDisabled={busy} open={!!confirmation} onClose={()=>{if(!busy){if(confirmation)feedback.reset(confirmation.id);setConfirmation(null);}}} title={confirmation?.title || "Confirm your action."}>
        {confirmation && <div className="workspace-form"><p>{confirmation.description}</p>
          {error && <p className="form-feedback-error" role="alert"><X size={15}/><span>{error}</span></p>}
          <div className="confirmation-actions"><Button variant="secondary" disabled={busy} onClick={()=>{feedback.reset(confirmation.id);setConfirmation(null);}}>Keep access</Button>
            <ActionButton label={confirmation.label} phase={feedback.phase(confirmation.id)} pendingLabel="Updating…" successLabel="Access removed" disabled={busy} onClick={()=>{const target=confirmation;void target.run().then(saved=>{if(saved)feedback.succeed(target.id,()=>setConfirmation(null));});}}/>
          </div>
        </div>}
      </Dialog>
      <Dialog open={customize} onClose={()=>setCustomize(false)} title="Your view. Your priorities." className="customize-dialog"
        footer={<><Button variant="ghost" onClick={()=>updateWidgets(["network","attention","activity","privacy"])}>Restore defaults</Button><Button onClick={()=>setCustomize(false)}>Done</Button></>}>
        <p className="customize-intro">Choose what matters at a glance. Your layout is remembered for this workspace on this device.</p>
        <div className="customize-layout">
          <div className="customize-preview" aria-hidden="true">
            <span className="customize-preview-label">Your overview</span>
            <div className="customize-preview-window"><div className="customize-preview-bar"><span>relay</span><i/><i/><i/></div>
              <div className="customize-preview-content"><strong>Your network.<br/>In focus.</strong>
                <div className="customize-preview-block" data-visible={widgets.includes("network")}><div className="customize-preview-metrics"><span><b>{data?.metrics.suppliers || 0}</b>Companies</span><span><b>{data?.metrics.documents || 0}</b>Documents</span></div></div>
                <div className="customize-preview-block" data-visible={widgets.includes("attention")}><div><div className="customize-preview-card"><Bell size={12}/><span>Needs attention</span><div className="customize-preview-line"/><div className="customize-preview-line"/></div></div></div></div>
                <div className="customize-preview-block" data-visible={widgets.includes("activity")}><div><div className="customize-preview-card"><Activity size={12}/><span>Recent activity</span><div className="customize-preview-line"/></div></div>
                <div className="customize-preview-block" data-visible={widgets.includes("privacy")}><div><div className="customize-preview-privacy"><ShieldCheck size={12}/><span>Private by company.</span></div></div></div>
                {!widgets.length && <span className="customize-preview-empty">A little space.<br/>Made for you.</span>}
              </div>
            </div>
            <p>Your choices, reflected live.</p>
          </div>
          <div className="customize-widget-list">
          {[{id:"network",label:"Network summary",description:"Supplier, profile, document and request totals.",icon:LayoutGrid},{id:"attention",label:"Needs attention",description:"Connections with missing information or deadlines.",icon:Bell},{id:"activity",label:"Recent activity",description:"The latest changes in your workspace.",icon:Activity},{id:"privacy",label:"Privacy reminder",description:"A direct route to your visibility settings.",icon:ShieldCheck}].map(({icon:Icon,...widget})=><label className="settings-switch" key={widget.id}>
            <span className="customize-widget-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.6}/></span>
            <span><strong>{widget.label}</strong><small>{widget.description}</small></span>
            <input type="checkbox" role="switch" aria-label={widget.label} checked={widgets.includes(widget.id)} onChange={event=>updateWidgets(event.target.checked?[...widgets,widget.id]:widgets.filter(id=>id!==widget.id))}/>
          </label>)}
          </div>
        </div>
        <div className="layout-saved" role="status">{layoutSaved ? <><Check size={13}/>Saved on this device</> : "Changes apply to this page only"}</div>
      </Dialog>
      <Dialog
        open={!!supplier}
        closeDisabled={busy}
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
              {refreshing && <LoadingIndicator compact label="Updating details…"/>}
              {detailTab === "Company" && (
                <form className="workspace-form" onSubmit={saveSupplier} onInvalidCapture={event=>invalidForm(event,"supplier")} aria-busy={feedback.phase("supplier") === "pending"} onChange={()=>{feedback.reset("supplier");setError("");}}>
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
                    <ActionButton disabled={busy} type="submit" phase={feedback.phase("supplier")} label="Save company information" successLabel="Company information saved"/>
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
                    <ActionButton variant="secondary" disabled={busy} label="Create upload link" pendingLabel="Creating…" successLabel="Link created"
                      phase={feedback.phase(`upload-link:${supplier.id}`)} onClick={() => void createLink(supplier.id)}/>
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
                            <Select
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
                            </Select>
                            <ActionButton type="submit" variant="secondary" disabled={busy}
                              phase={feedback.phase(actionKey("review_requirement", {id:requirement.id}))}
                              label={requirement.status === "satisfied" ? "Mark missing" : "Mark complete"}
                              successLabel="Requirement updated"/>
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
            {data.detailTotal>50 && <PageControls page={detailPage} total={data.detailTotal} busy={refreshing} onChange={setDetailPage}/>}
          </>
        )}
      </Dialog>
      <Dialog
        open={dialog !== null}
        closeDisabled={busy}
        onClose={() => {
          if (!busy) { feedback.reset("dialog"); setDialog(null); }
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
            <form className="workspace-form" onSubmit={submit} aria-busy={feedback.phase("dialog") === "pending"}
              onChange={()=>{feedback.reset("dialog");setError("");}}
              onInvalidCapture={event=>invalidForm(event,"dialog")}>
              <fieldset className="action-form-fields" disabled={busy || feedback.phase("dialog") === "success"}>
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
                    <Select name="role">
                      <option value="member">
                        Member · View company information
                      </option>
                      {data.role === "owner" && (
                        <option value="admin">
                          Administrator · Manage company information
                        </option>
                      )}
                    </Select>
                  </label>
                  <p className="quiet-note">
                    The recipient must accept using this confirmed email
                    address. Invitation expires in seven days.
                  </p>
                </>
              ) : dialog === "share" ? (
                <>
                  <label>Find a recipient<Input type="search" value={directoryQuery} onChange={event=>setDirectoryQuery(event.target.value)} placeholder="Search registered companies…"/></label>
                  <label>
                    Recipient company
                    <Select name="recipient" required>
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
                    </Select>
                  </label>
                  <label>Find documents<Input type="search" value={lookupQuery} onChange={event=>setLookupQuery(event.target.value)} placeholder="Search document names…"/></label>
                  <p className="quiet-note">{shareIds.length} documents selected. Search to find older files; your selection is retained.</p>
                  <fieldset className="share-document-options">
                    <legend>Choose documents to share</legend>
                    {data.documents.map((doc) => (
                      <label key={doc.id}>
                        <input
                          type="checkbox"
                          name="documents"
                          value={doc.id}
                          checked={shareIds.includes(doc.id)}
                          onChange={event=>setShareIds(event.target.checked?[...shareIds,doc.id]:shareIds.filter(id=>id!==doc.id))}
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
                  <label>Find a supplier<Input type="search" value={lookupQuery} onChange={event=>setLookupQuery(event.target.value)} placeholder="Search your suppliers…"/></label>
                  <label>
                    Supplier
                    <Select required name="connection" disabled={refreshing}>
                      <option value="">Choose a supplier</option>
                      {data.health.filter(row=>data.suppliers.some(company=>company.id===row.supplier_id && company.legal_name.toLowerCase().includes(searchTerms.lookup.toLowerCase()))).map((row) => (
                        <option key={row.id} value={row.id || ""}>
                          {
                            data.suppliers.find(
                              (company) => company.id === row.supplier_id,
                            )?.legal_name
                          }
                        </option>
                      ))}
                    </Select>
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
                  <label>Find a supplier<Input type="search" value={lookupQuery} onChange={event=>setLookupQuery(event.target.value)} placeholder="Search your suppliers…"/></label>
                  <label>
                    Supplier
                    <Select required name="supplier" disabled={refreshing}>
                      <option value="">Choose a supplier</option>
                      {data.suppliers.filter(company=>company.legal_name.toLowerCase().includes(searchTerms.lookup.toLowerCase())).map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.legal_name}
                        </option>
                      ))}
                    </Select>
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
                        <Select name="kind">
                          <option value="certificate">Certificate</option>
                          <option value="declaration">Declaration</option>
                          <option value="company">Company information</option>
                        </Select>
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
              </fieldset>
              {error && <p className="form-feedback-error" role="alert"><X size={15}/><span>{error}</span></p>}
              <ActionButton type="submit" phase={feedback.phase("dialog")}
                disabled={busy || ((dialog === "document" || dialog === "request" || dialog === "product") && !data.suppliers.length)}
                label={dialog === "invite" ? "Create invitation" : dialog === "share" ? "Share selected documents" : "Save to workspace"}
                successLabel={dialog === "invite" ? "Invitation ready" : dialog === "share" ? "Documents shared" : dialog === "request" ? "Request created" : "Saved to workspace"}
                pendingLabel={dialog === "document" ? "Uploading…" : "Saving…"}/>
              <span className="sr-only" role="status">{feedback.phase("dialog") === "success" ? "Saved successfully." : ""}</span>
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
  const feedback = useActionFeedback();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = event.currentTarget;
    if (!feedback.begin("certificate")) return;
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
      feedback.succeed("certificate");
      await saved();
      target.reset();
      notify("Certificate details recorded.");
    } catch (error) {
      feedback.fail("certificate");
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="workspace-form certificate-record-form" onSubmit={submit} onChange={()=>{feedback.reset("certificate");setError("");}} onInvalidCapture={event=>{event.preventDefault();feedback.fail("certificate");setError("Check the highlighted fields before saving.");focusInvalidField(event.currentTarget);}}>
      <h3>Record certificate details.</h3>
      <label>
        Supporting certificate
        <Select name="document" required>
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
        </Select>
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
      <ActionButton type="submit" disabled={busy} phase={feedback.phase("certificate")} label="Record certificate" successLabel="Certificate recorded"/>
    </form>
  );
}
function PageControls({page,total,busy,onChange}:{page:number;total:number;busy:boolean;onChange:(page:number)=>void}){
 return <nav className="connected-pagination" aria-label="Results pagination"><span>Page {page+1} of {Math.ceil(total/50)}</span><div><Button variant="secondary" type="button" disabled={busy || page===0} onClick={()=>onChange(page-1)}>Previous</Button><Button variant="secondary" type="button" disabled={busy || (page+1)*50>=total} onClick={()=>onChange(page+1)}>Next</Button></div></nav>;
}
