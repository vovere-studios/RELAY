# VOVERE backend reference for RELAY

Read-only review of `vovere-studios/VOVERE-STUDIOS` at commit `ce0d292`, 7 October 2026. No VOVERE code, settings, database or deployment was changed.

- Active browser database/auth client: `src/lib/db/client.ts`, explicitly targets the external Supabase project `pdjtlvurtuqmmtsfrfmn`. Public credentials are pinned to avoid Lovable Cloud environment overrides.
- Active server database client: `src/lib/db/client.server.ts`, uses `MY_SUPABASE_SERVICE_ROLE_KEY` as a server-only secret.
- Contact and partner submissions use that external database.
- Transactional email: `src/lib/email/enqueue.server.ts` uses `@lovable.dev/email-js` and `LOVABLE_API_KEY`. Sender is `VOVERE Studios <noreply@vovere-studios.com>` with sending domain `notify.vovere-studios.com`. Optional application send logs are written to the external Supabase database.
- Auth email handler: `src/routes/lovable/email/auth/webhook.ts` uses the Lovable email SDK. Its presence does not establish that the external Supabase project's Auth hook is currently configured; that requires checking dashboard settings.
- Chatbot: `src/routes/api/public/concierge.ts` calls `https://ai.gateway.lovable.dev/v1/chat/completions`. That endpoint does not persist conversations to a database. AI and email providers still process payloads and may keep service logs.
- Legacy `src/integrations/supabase` and a `supabase/config.toml` targeting a different project remain in the repository. Active application imports reviewed use `src/lib/db`. This code audit does not confirm billing, usage, other deployed versions, or every historical storage object.

## RELAY direction

RELAY's browser client explicitly targets its own project `aadbcovypefhlpsmoinn`. Application database records, authentication and private files stay there; Lovable supplies the deployment host. No second application database or data mirror is introduced by this integration. Email delivery and AI remain separately configurable services and are not enabled by pushing frontend code. Do not copy VOVERE service-role keys or API secrets into RELAY.
