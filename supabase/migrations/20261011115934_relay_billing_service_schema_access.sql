-- The public invoker wrapper needs schema USAGE to call its service-only private implementation.
-- Direct table privileges remain revoked; no client or anonymous role receives access.
grant usage on schema relay_private to service_role;
