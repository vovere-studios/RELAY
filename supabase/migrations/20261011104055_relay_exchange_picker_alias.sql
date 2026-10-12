-- The exchange document picker must not reuse the function's UUID loop variable as a row alias.
do $migration$
declare body text:=pg_get_functiondef('relay_private.exchange_api(text,jsonb)'::regprocedure);
 old_fragment text:='select coalesce(jsonb_agg(to_jsonb(d)),''[]'') into result from (select id,name,kind,uploaded_at from relay_private.active_documents where organization_id=org and supplier_id is null and verification_status<>''rejected'' and name ilike ''%''||term||''%'' order by uploaded_at desc,id limit 50 offset pg*50) d;';
 new_fragment text:='select coalesce(jsonb_agg(to_jsonb(picker_row)),''[]'') into result from (select id,name,kind,uploaded_at from relay_private.active_documents where organization_id=org and supplier_id is null and verification_status<>''rejected'' and name ilike ''%''||term||''%'' order by uploaded_at desc,id limit 50 offset pg*50) picker_row;';
begin
 if position(old_fragment in body)=0 then raise exception 'Exchange picker changed; inspect the live function before applying.';end if;
 execute replace(body,old_fragment,new_fragment);
end $migration$;
