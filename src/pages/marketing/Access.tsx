import { FieldLabel } from '../../components/FieldLabel';
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowLeft,
  Check,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "./Website";
import { Button, Input } from "../../components/ui";
import { useWorkspace } from "../../data/Workspace";
import { useFeedback } from "../../components/Feedback";
export function Access({ mode }: { mode: "signup" | "login" }) {
  const navigate = useNavigate();
  const { setProfile } = useWorkspace();
  const notify = useFeedback();
  const [stage, setStage] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !company.trim()) return;
    if (stage === 0) {
      setStage(1);
      return;
    }
    try {
      setProfile(name.trim(), email.trim(), company.trim());
      notify(
        "Your local workspace is ready.",
        "Explore your network. Changes stay on this browser.",
      );
      navigate("/app");
    } catch {
      setError("The workspace could not be created. Please try again.");
    }
  }
  return (
    <div className="public-site">
      <PublicHeader />
      <main className="public-main access-main" id="main" tabIndex={-1}>
        <section className="access-copy">
          <span className="eyebrow">
            {mode === "signup" ? "YOUR FIRST CONNECTION." : "WELCOME BACK."}
          </span>
          <h1>
            {mode === "signup" ? (
              <>
                A place for
                <br />
                your network.
              </>
            ) : (
              <>
                Back to
                <br />
                the bigger picture.
              </>
            )}
          </h1>
          <p>
            Structured information.
            <br />
            Considered connections.
            <br />A little more confidence.
          </p>
          <span className="access-attribution">A product of VOVERE</span>
        </section>
        <section className="access-panel">
          {mode === "login" ? (
            <>
              <span className="access-icon">
                <ShieldCheck size={25} />
              </span>
              <h2>Open your workspace.</h2>
              <p>
                This version runs locally. Account sign-in will be available
                when Relay is connected to its hosted services.
              </p>
              <Link className="button button-primary" to="/app">
                Open local workspace <ArrowUpRight size={17} />
              </Link>
              <Link className="access-secondary" to="/signup">
                Set up your local workspace <ArrowRightSmall />
              </Link>
              <div className="access-note">
                <strong>Your data stays here.</strong>
                <span>
                  This local workspace is tied to this browser. It is not a
                  secure account or a shared company environment.
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="access-progress">
                <span className={stage === 0 ? "active" : ""}>
                  01 / YOUR DETAILS
                </span>
                <span className={stage === 1 ? "active" : ""}>
                  02 / READY TO START
                </span>
              </div>
              <h2>
                {stage === 0
                  ? "Start with your company."
                  : "A clear starting point."}
              </h2>
              <p>
                {stage === 0
                  ? "Set up a local preview of your Relay workspace."
                  : "Review your details before opening the workspace."}
              </p>
              <form onSubmit={submit}>
                {stage === 0 ? (
                  <>
                    <FieldLabel>
                      Your name
                      <Input
                        required
                        maxLength={100}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Morgan"
                      />
                    </FieldLabel>
                    <FieldLabel>
                      Work email
                      <Input
                        required
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                      />
                    </FieldLabel>
                    <FieldLabel>
                      Company name
                      <Input
                        required
                        maxLength={160}
                        autoComplete="organization"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Your company"
                      />
                    </FieldLabel>
                  </>
                ) : (
                  <div className="access-review">
                    <Building2 size={30} />
                    <strong>{company}</strong>
                    <span>{name}</span>
                    <span>{email}</span>
                    <p>
                      <Check size={16} />
                      Example supplier network included
                    </p>
                    <p>
                      <Check size={16} />
                      Local documents and notifications
                    </p>
                  </div>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit">
                  {stage === 0 ? "Continue" : "Create local workspace"}
                  <ArrowUpRight size={17} />
                </Button>
                {stage === 1 && (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setStage(0)}
                  >
                    <ArrowLeft size={14} />
                    Edit details
                  </Button>
                )}
              </form>
              <div className="access-note">
                <strong>Local preview. No account created.</strong>
                <span>
                  Your details stay in this browser. No verification email is
                  sent. You can try Relay before connecting authentication and
                  cloud storage.
                </span>
              </div>
              <Link className="access-secondary" to="/app">
                Explore the example workspace instead <ArrowUpRight size={14} />
              </Link>
            </>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
function ArrowRightSmall() {
  return <ArrowUpRight size={14} />;
}
