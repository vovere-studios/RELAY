revoke truncate,references,trigger on all tables in schema public from anon,authenticated;
create index activities_org_supplier_idx on public.activities(organization_id,supplier_id);
create index certificates_org_supplier_document_idx on public.certificates(organization_id,supplier_id,document_id);
create index products_org_supplier_idx on public.products(organization_id,supplier_id);
create index request_requirements_request_fk_idx on public.request_requirements(organization_id,relationship_id,request_id);
create index request_requirements_requirement_fk_idx on public.request_requirements(organization_id,relationship_id,requirement_id);
create index requirements_document_fk_idx on public.requirements(organization_id,document_id);
drop policy tenant_create on public.documents;
create policy tenant_create on public.documents for insert to authenticated with check(relay_private.can_access_org(organization_id,true) and uploaded_by=(select auth.uid()) and verification_status='unverified');
-- Document provenance cannot be rewritten by browser clients.
revoke update on public.documents from authenticated;
grant update(name,kind,verification_status) on public.documents to authenticated;
