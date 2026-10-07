alter policy organizations_read on public.organizations using(owner_id=(select auth.uid()) or relay_private.can_access_org(id));
create index suppliers_source_fk_idx on public.suppliers(source_organization_id);
drop policy tenant_read on public.documents;
drop policy documents_shared_read on public.documents;
create policy documents_read on public.documents for select to authenticated using(relay_private.can_access_org(organization_id) or exists(select 1 from public.document_shares s where s.document_id=documents.id and s.revoked_at is null and relay_private.can_access_org(s.recipient_organization_id)));
