import { FieldLabel } from '../components/FieldLabel';
import { formValidationMessage } from "../lib/form-validation";
import { ActionButton, OutcomeMark, useActionFeedback } from "../components/ActionFeedback";

import { LoadingIndicator } from '../components/ui';
import { Select } from '../components/Select';
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Files, ShieldCheck } from "lucide-react";
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
  const navigate = useNavigate();
  const feedback = useActionFeedback();
  const [info, setInfo] = useState<IntakeInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  useEffect(() => {
    let active = true;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    void requireSupabase()
      .functions.invoke("relay-intake", { body: { action: "info", token },signal:controller.signal })
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
        } else {
          setInfo(result.data);
          if(new URLSearchParams(location.search).get('guest')!=='1') {
            const {data}=await requireSupabase().auth.getUser();
            if(active&&data.user) {
              try { sessionStorage.setItem('relay-pending-intake',token); navigate('/cloud?return=intake',{replace:true}); }
              catch { setError('Your browser cannot keep this request during sign-in. You can still send files below.'); }
            }
          }
        }
      }).catch(()=>{if(active)setError("The connection could not be opened. Please reload to try again.");}).finally(()=>clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);controller.abort();
    };
  }, [token,navigate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!info || busy || !feedback.begin("intake")) return;
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
      if(sessionStorage.getItem("relay-pending-intake")===token)sessionStorage.removeItem("relay-pending-intake");
      feedback.succeed("intake",()=>setSent(true));
    } catch (error) {
      feedback.fail("intake");
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
                Your documents.
                <br />
                One connection.
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
              Your submission is shared privately with the requesting company.
              No account required to upload.
            </span>
          </div>
        </section>
        <section className="access-panel intake-panel" data-delivered={sent}>
          {sent ? (
            <>
              <div className="intake-delivered-mark"><OutcomeMark tone="success"/></div>
              <h2>Your files have arrived.</h2>
              <p>
                Your documents are available to {info?.company} and are awaiting review.
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
                Link expires {dateLabel(info.expires_at)}.
              </p>
              <section className="intake-entry-options"><Link className="button button-primary" to="/login" onClick={()=>sessionStorage.setItem('relay-pending-intake',token)}>Choose from my workspace <ArrowUpRight size={17}/></Link><p>Already have RELAY? Sign in and send your saved documents.</p><Link className="intake-create-account" to="/signup" onClick={()=>sessionStorage.setItem('relay-pending-intake',token)}>New to RELAY? Keep your documents together <ArrowUpRight size={15}/></Link></section>
              <div className="intake-upload-divider"><span>Send without an account</span></div>
              <form onSubmit={submit} onChange={()=>{feedback.reset("intake");setError("");}} onInvalidCapture={event=>{event.preventDefault();feedback.fail("intake");setError(formValidationMessage(event.currentTarget));}}>
                <FieldLabel>
                  Your name
                  <Input
                    required
                    name="name"
                    autoComplete="name"
                    maxLength={100}
                    disabled={busy || feedback.phase("intake")==="success"}
                  />
                </FieldLabel>
                <FieldLabel>
                  Work email
                  <Input
                    required
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    disabled={busy || feedback.phase("intake")==="success"}
                  />
                </FieldLabel>
                <FieldLabel>
                  Document type
                  <Select name="kind" disabled={busy || feedback.phase("intake")==="success"}>
                    <option value="certificate">Certificate</option>
                    <option value="declaration">Declaration</option>
                    <option value="company">Company information</option>
                  </Select>
                </FieldLabel>
                <FieldLabel className="intake-drop">
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
                    disabled={busy || feedback.phase("intake")==="success"}
                    onChange={(event) =>
                      setFiles([...(event.target.files || [])])
                    }
                  />
                </FieldLabel>
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
                  <p className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{error}</span></p>
                )}
                <ActionButton type="submit" disabled={busy} label="Send documents" phase={feedback.phase("intake")} outcomeKey={feedback.version("intake")} pendingLabel="Sending documents…" successLabel="Documents delivered"/>
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
            <LoadingIndicator label="Opening your secure connection…"/>
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
              {busy ? <LoadingIndicator compact label="Joining…" /> : "Accept invitation"}
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
