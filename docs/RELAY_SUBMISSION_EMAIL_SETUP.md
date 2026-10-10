# Document submission confirmations

The workspace response sends documents first and independently requests transactional email confirmation. A delivery failure never reverses a completed document share. The user can retry the email confirmation; Lovable receives stable per-receipt, per-recipient idempotency keys.

## Activation

1. The company-owned-documents migration is now approved and applied. Its service-only delivery RPC validates a completed link-share receipt and derives confirmed sender and receiving administrator addresses. Client roles cannot execute this delivery RPC.
2. Configure `RELAY_SUPABASE_SECRET_KEY` in the Lovable **server secrets**, using the external RELAY project's service-role key. Never put it in VITE variables, source control, screenshots or a chat message. This privileged key stays server-side; the route first verifies the user's bearer identity and administrator access through the user-scoped exchange RPC.
3. Keep `LOVABLE_API_KEY` in the server secrets. Publish the new build.
4. Test an explicitly approved submission between disposable companies and confirm actual inbox delivery, retry idempotency and the receiving workspace event. Mail templates contain a generic dashboard URL; private upload tokens and document names are not included in emails.

This route currently handles authenticated upload-link sharing only. Guest confirmation and direct company-request email delivery still need implementation. The backend company-exchange tests passed. Own-company-documents tests passed after activation. No real emails were sent during this implementation.
