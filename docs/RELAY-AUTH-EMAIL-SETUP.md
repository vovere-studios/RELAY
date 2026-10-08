# RELAY authentication and email

RELAY stores accounts, workspaces and documents in external Supabase project `aadbcovypefhlpsmoinn`. Lovable hosts the application and delivers mail. No second user database is required.

## Implemented

- `/login` and `/signup` use Supabase `signInWithOtp`; `/login` does not create users. Signup preserves full name/company metadata.
- The code form uses `verifyOtp` with type `email`, accepts current Supabase 6–10 digit codes, supports resend after 60 seconds and preserves pending workspace invites.
- `/api/auth/email-hook` accepts signed Supabase Standard Webhooks. It rejects missing configuration, invalid signatures and malformed payloads. Lovable's own auth webhook handler is not interchangeable with this format.
- All six Supabase mail actions are supported. Secure email changes send the correct code to both the old and new addresses. Stable idempotency keys prevent duplicate deliveries on retries.
- Sender: `RELAY <noreply@relay.vovere-studios.com>`; sending domain: `notify.relay.vovere-studios.com`; reply-to: `admin@vovere-studios.com`.

## Required production activation

1. Publish the latest connected GitHub main in Lovable. The custom domain must serve the application; it returned `404 / dwl_no_hash` during setup on 8 October 2026.
2. Ensure `LOVABLE_API_KEY` exists in the Lovable server environment. Do not expose it as a VITE variable. The existing Lovable email setup normally provisions it; its presence has not been independently confirmed.
3. In RELAY Supabase Authentication → Auth Hooks, add an HTTPS **Send Email** hook pointing at `https://relay.vovere-studios.com/api/auth/email-hook`.
4. Generate the hook signing secret in Supabase and set the same value as `RELAY_AUTH_EMAIL_HOOK_SECRET` (Lovable reserves the `SUPABASE_` prefix) in the Lovable server environment. The handler accepts `v1,whsec_…` and `whsec_…` forms. Never commit this secret or paste it into a chat. Configure both sides before enabling the hook; otherwise login emails will fail.
5. Keep Email Provider and email confirmation enabled. A enabled Send Email hook replaces SMTP for auth emails. Do not disable confirmation to make testing pass.
6. Site URL: `https://relay.vovere-studios.com`. Allow exact callbacks `/account` and `/account-security` on this domain and on `http://127.0.0.1:5174` / `http://localhost:5174` for local testing. Add the actual Lovable preview origin explicitly if needed. Do not allow broad arbitrary-host wildcards.
7. Request a code for `admin@vovere-studios.com`, enter the received code and verify that the existing VOVERE Studios owner workspace opens. Test a separate new registration and an invitation acceptance.

DNS for the two mail TXT records and `notify.relay` NS delegation is complete. Domain verification alone does not activate the Supabase Send Email hook.

## Verified locally

TypeScript check and production build; passwordless login rendered in the browser; rejected unsigned requests; secure email-change token mapping; signed Supabase webhook through Lovable SDK to a local mock mail server with correct sender, reply-to and idempotency key. These checks do not prove actual mailbox delivery.

Team invitations and supplier requests currently offer copyable links. Automatic transactional delivery for those actions is a separate implementation step; it is not claimed complete here.
