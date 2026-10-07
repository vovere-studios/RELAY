create function public.add_supplier_connection(org_id uuid, company_name text, country_name text, country_iso text, supplier_category text default '', email text default '')
returns uuid language plpgsql security invoker set search_path='' as $$
declare supplier uuid; relationship uuid;
begin
 if not relay_private.can_access_org(org_id,true) then raise exception 'Company access denied' using errcode='42501'; end if;
 insert into public.suppliers(organization_id,legal_name,country,country_code,category,contact_email) values(org_id,trim(company_name),country_name,country_iso,supplier_category,email) returning id into supplier;
 insert into public.supplier_relationships(organization_id,supplier_id) values(org_id,supplier) returning id into relationship;
 insert into public.requirements(organization_id,relationship_id,name,kind) values(org_id,relationship,'Company registration','company'),(org_id,relationship,'ISO 9001 certificate','document'),(org_id,relationship,'REACH declaration','document');
 insert into public.activities(organization_id,supplier_id,title,kind) values(org_id,supplier,'Supplier connected','supplier');
 return supplier;
end $$;
revoke all on function public.add_supplier_connection(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.add_supplier_connection(uuid,text,text,text,text,text) to authenticated;
create function public.prepare_information_request(connection_id uuid, request_title text, due_date date)
returns uuid language plpgsql security invoker set search_path='' as $$
declare connection public.supplier_relationships; request uuid;
begin
 select * into connection from public.supplier_relationships where id=connection_id;
 if connection.id is null or not relay_private.can_access_org(connection.organization_id,true) then raise exception 'Company access denied' using errcode='42501'; end if;
 if due_date<current_date then raise exception 'Due date must not be in the past'; end if;
 if not exists(select 1 from public.requirements where relationship_id=connection.id and status='missing') then raise exception 'No missing requirements'; end if;
 insert into public.data_requests(organization_id,relationship_id,title,due_at) values(connection.organization_id,connection.id,trim(request_title),due_date) returning id into request;
 insert into public.request_requirements(organization_id,relationship_id,request_id,requirement_id) select connection.organization_id,connection.id,request,id from public.requirements where relationship_id=connection.id and status='missing';
 insert into public.activities(organization_id,supplier_id,title,description,kind) values(connection.organization_id,connection.supplier_id,'Information request prepared',request_title,'request');
 return request;
end $$;
revoke all on function public.prepare_information_request(uuid,text,date) from public,anon;
grant execute on function public.prepare_information_request(uuid,text,date) to authenticated;
