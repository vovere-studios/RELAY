import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PublicHeader, PublicFooter } from "./marketing/Website";
import { Button, Input } from "../components/ui";
import { requireSupabase } from "../lib/supabase";
import { errorMessage } from "../lib/cloud-api";
export function AccountSecurity({ recovery = false }: { recovery?: boolean }) {
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    let active = true;
    void requireSupabase()
      .auth.getUser()
      .then(({ data }) => {
        if (active) {
          setEmail(data.user?.email || "");
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    const target = event.currentTarget;
    const form = new FormData(target);
    try {
      const client = requireSupabase();
      if (recovery) {
        const result = await client.auth.resetPasswordForEmail(
          String(form.get("email")).trim(),
          { redirectTo: location.origin + "/account-security" },
        );
        if (result.error) throw result.error;
        setSuccess(
          "If an account exists, a recovery email has been requested.",
        );
      } else {
        const password = String(form.get("password"));
        if (password !== String(form.get("confirm")))
          throw new Error("The passwords do not match.");
        const result = await client.auth.updateUser({ password });
        if (result.error) throw result.error;
        setSuccess("Your password has been updated.");
        target.reset();
      }
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="public-site">
      <PublicHeader />
      <main id="main" tabIndex={-1} className="public-main join-main">
        <section className="access-panel">
          <span className="eyebrow">ACCOUNT SECURITY</span>
          <h1>{recovery ? "Find your way back." : "Your account."}</h1>
          {!ready ? (
            <p role="status">Opening your account…</p>
          ) : !recovery && !email ? (
            <>
              <p>
                Open the recovery link from your email or sign in to manage your
                password.
              </p>
              <Link className="button button-primary" to="/login">
                Sign in
              </Link>
            </>
          ) : (
            <form onSubmit={submit}>
              {recovery ? (
                <label>
                  Work email
                  <Input
                    required
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={email}
                  />
                </label>
              ) : (
                <>
                  <p>{email}</p>
                  <label>
                    New password
                    <Input
                      required
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                    />
                  </label>
                  <label>
                    Confirm password
                    <Input
                      required
                      name="confirm"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                    />
                  </label>
                </>
              )}
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              {success && <p role="status">{success}</p>}
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : recovery
                    ? "Request recovery email"
                    : "Update password"}
              </Button>
            </form>
          )}
          <Link className="access-secondary" to="/cloud">
            Return to your workspace
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
