import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Check, Files, ShieldCheck } from "lucide-react";
import { PublicHeader, PublicFooter } from "./marketing/Website";
import { Button, Input } from "../components/ui";
import { requireSupabase } from "../lib/supabase";
import { dateLabel, errorMessage, workspaceAction } from "../lib/cloud-api";

type IntakeInfo = {
  company: string;
  supplier: string;
  title: string;
  expires_at: string;
  remaining: number;
};
const tokenFromURL = () =>
  new URLSearchParams(location.hash.slice(1)).get("token") || "";
export function Intake() {
  const [token] = useState(tokenFromURL);
  const [info, setInfo] = useState<IntakeInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  useEffect(() => {
    let active = true;
    void requireSupabase()
      .functions.invoke("relay-intake", { body: { action: "info", token } })
      .then(async (result) => {
        if (!active) return;
        if (result.error) {
          let reason =
            "This upload link is invalid, expired or no longer available.";
          try {
            const json = await result.error.context?.json();
            reason = json?.error || reason;
          } catch {}
          setError(reason);
        } else setInfo(result.data);
      });
    return () => {
      active = false;
    };
  }, [token]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!info) return;
    setError("");
    setBusy(true);
    try {
      if (!files.length || files.length > Math.min(5, info.remaining))
        throw new Error(
          "Choose up to five files within the remaining link limit.",
        );
      if (
        files.some(
          (file) =>
            !file.size ||
            file.size > 10 * 1024 * 1024 ||
            !["application/pdf", "image/png", "image/jpeg"].includes(file.type),
        )
      )
        throw new Error("Choose PDF, PNG or JPEG files up to 10 MB each.");
      const form = new FormData(event.currentTarget);
      form.set("token", token);
      form.delete("files");
      for (const file of files) form.append("files", file);
      const result = await requireSupabase().functions.invoke("relay-intake", {
        body: form,
      });
      if (result.error) {
        let reason = "Your files could not be sent.";
        try {
          reason = (await result.error.context?.json())?.error || reason;
        } catch {}
        throw new Error(reason);
      }
      setSent(true);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="public-site">
      <PublicHeader />
      <main id="main" tabIndex={-1} className="public-main intake-main">
        <section className="intake-intro">
          <span className="eyebrow">A DIRECT CONNECTION</span>
          <h1>
            {sent ? (
              <>
                Evidence.
                <br />
                Delivered.
              </>
            ) : (
              <>
                Good information.
                <br />
                Starts here.
              </>
            )}
          </h1>
          <p>
            {info
              ? `${info.company} has requested information from ${info.supplier}.`
              : "A private place to send your company documents."}
          </p>
          <div className="intake-assurance">
            <ShieldCheck size={19} />
            <span>
              Only the receiving company can access your submission. No account
              required.
            </span>
          </div>
        </section>
        <section className="access-panel intake-panel">
          {sent ? (
            <>
              <span className="intake-success">
                <Check size={26} />
              </span>
              <h2>Your files have arrived.</h2>
              <p>
                Your submission is saved in {info?.company}'s private workspace
                and is awaiting review.
              </p>
              <div className="access-note">
                <strong>Your next connection can be simpler.</strong>
                <span>
                  Create your Relay account to keep your documents together and
                  share them with registered companies from your workspace.
                </span>
              </div>
              <Link className="button button-primary" to="/signup">
                Create your account <ArrowUpRight size={17} />
              </Link>
              <Link className="access-secondary" to="/">
                Discover Relay
              </Link>
            </>
          ) : info ? (
            <>
              <span className="eyebrow">{info.company}</span>
              <h2>{info.title}</h2>
              <p>
                Send certificates, declarations or company information. Link
                expires {dateLabel(info.expires_at)}.
              </p>
              <form onSubmit={submit}>
                <label>
                  Your name
                  <Input
                    required
                    name="name"
                    autoComplete="name"
                    maxLength={100}
                    disabled={busy}
                  />
                </label>
                <label>
                  Work email
                  <Input
                    required
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    disabled={busy}
                  />
                </label>
                <label>
                  Document type
                  <select name="kind" disabled={busy}>
                    <option value="certificate">Certificate</option>
                    <option value="declaration">Declaration</option>
                    <option value="company">Company information</option>
                  </select>
                </label>
                <label className="intake-drop">
                  <Files size={25} />
                  <strong>
                    {files.length
                      ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
                      : "Choose your documents"}
                  </strong>
                  <span>
                    PDF, PNG or JPEG · 10 MB each · Up to{" "}
                    {Math.min(5, info.remaining)} files
                  </span>
                  <input
                    aria-label="Choose documents to send"
                    name="files"
                    type="file"
                    required
                    multiple
                    accept="application/pdf,image/png,image/jpeg"
                    disabled={busy}
                    onChange={(event) =>
                      setFiles([...(event.target.files || [])])
                    }
                  />
                </label>
                {files.length > 0 && (
                  <ul className="intake-file-list">
                    {files.map((file, i) => (
                      <li key={`${file.name}-${i}`}>
                        <span>{file.name}</span>
                        <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
                      </li>
                    ))}
                  </ul>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={busy}>
                  {busy ? "Sending your documents…" : "Send documents"}
                  <ArrowUpRight size={16} />
                </Button>
              </form>
              <p className="quiet-note">
                By sending, you choose to share these files and your contact
                details with {info.company}.
              </p>
            </>
          ) : error ? (
            <>
              <h2>This link is unavailable.</h2>
              <p role="alert">{error}</p>
              <p>Please ask the receiving company for a new link.</p>
              <Link className="button button-secondary" to="/">
                Discover Relay <ArrowUpRight size={16} />
              </Link>
            </>
          ) : (
            <p role="status">Opening your secure connection…</p>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
export function JoinWorkspace() {
  const navigate = useNavigate();
  const [token] = useState(tokenFromURL);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void requireSupabase()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setSignedIn(!!data.user);
      });
    return () => {
      active = false;
    };
  }, []);
  async function accept() {
    setBusy(true);
    setError("");
    try {
      const result = await workspaceAction<{ organization_id: string }>(
        "claim_invite",
        { token },
      );
      sessionStorage.removeItem("relay-pending-invite");
      navigate(`/cloud?org=${result.organization_id}`, { replace: true });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  // The secret remains in session storage only while the recipient signs in.
  function remember() {
    try {
      sessionStorage.setItem("relay-pending-invite", token);
    } catch {}
  }
  return (
    <div className="public-site">
      <PublicHeader />
      <main id="main" tabIndex={-1} className="public-main join-main">
        <section className="access-panel">
          <span className="eyebrow">YOUR NEXT CONNECTION</span>
          <h1>Join your team.</h1>
          <p>
            Accept your invitation using the confirmed email address that your
            company invited.
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {signedIn ? (
            <Button onClick={() => void accept()} disabled={busy}>
              {busy ? "Joining…" : "Accept invitation"}
              <ArrowUpRight size={17} />
            </Button>
          ) : (
            <>
              <Link
                className="button button-primary"
                to="/login"
                onClick={remember}
              >
                Sign in to accept <ArrowUpRight size={17} />
              </Link>
              <Link
                className="access-secondary"
                to="/signup"
                onClick={remember}
              >
                Create an account
              </Link>
            </>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
