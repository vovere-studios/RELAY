-- Run after relay_document_lifecycle. All fixtures and simulated identities are rolled back.
begin;
do $test$
declare owner_id uuid:=gen_random_uuid(); employee uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); other_org uuid:=gen_random_uuid(); sid uuid; rel uuid; own_doc uuid:=gen_random_uuid(); supplier_doc uuid:=gen_random_uuid(); req uuid; v jsonb; denied boolean; own_path text; supplier_path text; foreign_sid uuid; previous_count integer;
begin
 insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values(owner_id,'lifecycle-owner@example.invalid','{}','{}'),(employee,'lifecycle-member@example.invalid','{}','{}'),(outsider,'lifecycle-outsider@example.invalid','{}','{}');
 insert into public.organizations(id,owner_id,legal_name) values(org,owner_id,'Lifecycle test company'),(other_org,outsider,'Other test company');
 insert into public.organization_members(organization_id,user_id,role) values(org,employee,'member');
 perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
 sid:=public.add_supplier_connection(org,'Test supplier','Austria','AT','','');
 select id into rel from public.supplier_relationships where supplier_id=sid and organization_id=org;
 own_path:=org||'/company/'||own_doc||'/Own.pdf';supplier_path:=org||'/'||sid||'/'||supplier_doc||'/Supplier.pdf';
 insert into public.documents(id,organization_id,supplier_id,name,kind,mime_type,storage_path,uploaded_by) values(own_doc,org,null,'Own.pdf','company','application/pdf',own_path,owner_id),(supplier_doc,org,sid,'Supplier.pdf','certificate','application/pdf',supplier_path,owner_id);
 select id into req from public.requirements where relationship_id=rel and kind='document' limit 1;
 perform public.relay_workspace_api('review_requirement',jsonb_build_object('organization_id',org,'id',req,'status','satisfied','document_id',supplier_doc));
 v:=public.relay_workspace_snapshot(jsonb_build_object('organization_id',org,'view','documents'));
 if (v->>'total')::int<>1 or jsonb_array_length(v->'documents')<>1 or v->'documents'->0->>'id'<>own_doc::text then raise exception 'Company library contains supplier files or incorrect count';end if;
 v:=public.relay_workspace_snapshot(jsonb_build_object('organization_id',org,'view','suppliers','selected',sid,'detail_tab','Documents'));
 if jsonb_array_length(v->'documents')<>1 or v->'documents'->0->>'id'<>supplier_doc::text then raise exception 'Supplier document missing';end if;
 -- Members may read but cannot approve, reject, remove or restore.
 execute 'reset role';perform set_config('request.jwt.claim.sub',employee::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.relay_resource_lifecycle('trash',jsonb_build_object('organization_id',org,'resource','document','id',own_doc));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Member can remove document';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.relay_resource_lifecycle('reject',jsonb_build_object('organization_id',org,'resource','document','id',supplier_doc,'note','Invalid fixture'));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Outsider can reject document';end if;
 if exists(select 1 from public.documents where id=own_doc) then raise exception 'Foreign company document visible';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
 -- Review rejection resets evidence and preserves a reason.
 perform public.relay_resource_lifecycle('reject',jsonb_build_object('organization_id',org,'resource','document','id',supplier_doc,'note','The certificate dates need correction.'));
 if (select verification_status from public.documents where id=supplier_doc)<>'rejected' or (select review_note from public.documents where id=supplier_doc)='' then raise exception 'Rejection reason lost';end if;
 if (select status from public.requirements where id=req)<>'missing' or (select document_id from public.requirements where id=req) is not null then raise exception 'Rejected evidence still satisfies requirement';end if;
 denied:=false;begin perform public.relay_workspace_api('review_requirement',jsonb_build_object('organization_id',org,'id',req,'status','satisfied','document_id',supplier_doc));exception when others then denied:=true;end;if not denied then raise exception 'Rejected document accepted as evidence';end if;
 -- Sharing tables are private to the API; test its evidence trigger with a privileged fixture insert.
 execute 'reset role';
 denied:=false;begin insert into public.document_shares(document_id,sender_organization_id,recipient_organization_id,shared_by) values(supplier_doc,org,other_org,owner_id);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Rejected document can be shared';end if;
 execute 'set local role authenticated';
 perform public.relay_resource_lifecycle('review',jsonb_build_object('organization_id',org,'resource','document','id',supplier_doc));
 -- Soft deletion hides metadata and retains physical objects, even for orphan-cleanup callers.
 execute 'reset role';insert into storage.objects(bucket_id,name) values('relay-documents',own_path),('relay-documents',supplier_path);
 insert into public.document_shares(document_id,sender_organization_id,recipient_organization_id,shared_by) values(own_doc,org,other_org,owner_id);
 perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
 perform public.relay_resource_lifecycle('trash',jsonb_build_object('organization_id',org,'resource','document','id',own_doc));
 if exists(select 1 from public.documents where id=own_doc) then raise exception 'Trashed metadata visible';end if;
 if exists(select 1 from storage.objects where bucket_id='relay-documents' and name=own_path) then raise exception 'Trashed file readable';end if;
 -- Supabase forbids direct storage-table deletes. Check the restrictive cleanup predicate instead.
 if relay_private.file_is_orphan(own_path) then raise exception 'Cleanup regards trashed file as orphan';end if;
 v:=public.relay_resource_lifecycle('list',jsonb_build_object('organization_id',org,'resource','document'));
 if (v->>'total')::int<>1 then raise exception 'Trash missing removed document';end if;
 execute 'reset role';if not exists(select 1 from storage.objects where bucket_id='relay-documents' and name=own_path) then raise exception 'Orphan cleanup destroyed trashed document';end if;
 if exists(select 1 from public.document_shares where document_id=own_doc and revoked_at is null) then raise exception 'Trash did not revoke sharing';end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
 perform public.relay_resource_lifecycle('restore',jsonb_build_object('organization_id',org,'resource','document','id',own_doc));
 if not exists(select 1 from public.documents where id=own_doc) then raise exception 'Restored document unavailable';end if;
 -- A recipient can decline/remove a reference without changing or destroying the sender's original.
 execute 'reset role';update public.document_shares set revoked_at=null where document_id=own_doc and recipient_organization_id=other_org;
 execute 'reset role';perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
 foreign_sid:=public.add_supplier_connection(other_org,'Sending test company','Austria','AT','','');
 execute 'reset role';
 update public.suppliers set source_organization_id=org where id=foreign_sid and organization_id=other_org;
 execute 'set local role authenticated';
 perform public.relay_resource_lifecycle('reject',jsonb_build_object('organization_id',other_org,'resource','shared_document','id',own_doc,'note','Please provide the current version.'));
 v:=public.relay_resource_lifecycle('status',jsonb_build_object('organization_id',other_org,'resource','shared_document','id',own_doc));
 if v->>'status'<>'rejected' or (select verification_status from public.documents where id=own_doc)='rejected' then raise exception 'Recipient review changed sender original';end if;
 perform public.relay_resource_lifecycle('trash',jsonb_build_object('organization_id',other_org,'resource','shared_document','id',own_doc));
 if exists(select 1 from public.documents where id=own_doc) or exists(select 1 from storage.objects where bucket_id='relay-documents' and name=own_path) then raise exception 'Removed share still accessible by recipient';end if;
 v:=public.relay_resource_lifecycle('list',jsonb_build_object('organization_id',other_org,'resource','shared_document','supplier_id',foreign_sid));
 if (v->>'total')::int<>1 then raise exception 'Shared file missing from recipient Trash';end if;
 perform public.relay_resource_lifecycle('restore',jsonb_build_object('organization_id',other_org,'resource','shared_document','id',own_doc));
 if not exists(select 1 from public.documents where id=own_doc) then raise exception 'Shared document restore failed';end if;
 perform public.relay_resource_lifecycle('review',jsonb_build_object('organization_id',other_org,'resource','shared_document','id',own_doc));
 v:=public.relay_workspace_snapshot(jsonb_build_object('organization_id',other_org,'view','suppliers','selected',foreign_sid,'detail_tab','Documents'));
 if jsonb_array_length(v->'shares')<>1 or v->'shares'->0->>'review_status'<>'verified' then raise exception 'Supplier lacks received reference and recipient review';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
 if not exists(select 1 from storage.objects where bucket_id='relay-documents' and name=own_path) then raise exception 'Recipient destroyed sender file';end if;
 -- Removing requirements changes both visible checklist and health denominator.
 select missing_requirements into previous_count from public.relationship_health where id=rel;
 perform public.relay_resource_lifecycle('trash',jsonb_build_object('organization_id',org,'resource','requirement','id',req));
 if exists(select 1 from public.requirements where id=req) then raise exception 'Removed requirement visible';end if;
 if (select missing_requirements from public.relationship_health where id=rel)<>previous_count-1 then raise exception 'Removed requirement still counted in supplier health';end if;
 v:=public.relay_resource_lifecycle('list',jsonb_build_object('organization_id',org,'resource','requirement','supplier_id',sid));
 if (v->>'total')::int<>1 then raise exception 'Requirement Trash missing';end if;
 perform public.relay_resource_lifecycle('restore',jsonb_build_object('organization_id',org,'resource','requirement','id',req));
 if not exists(select 1 from public.requirements where id=req) then raise exception 'Requirement restore failed';end if;
 v:=public.relay_exchange_api('documents',jsonb_build_object('organization_id',org));
 if jsonb_array_length(v)<>1 or v->0->>'id'<>own_doc::text then raise exception 'Sharing picker includes collected supplier documents';end if;
 -- Search/count/pagination operate on the company library before the 50-row cap.
 with fixtures as materialized (select n,gen_random_uuid() fixture_id from generate_series(1,51) n)
 insert into public.documents(id,organization_id,supplier_id,name,kind,mime_type,storage_path,uploaded_by)
 select fixture_id,org,null,'Fixture'||n||'.pdf','company','application/pdf',org||'/company/'||fixture_id||'/Fixture.pdf',owner_id from fixtures;
 v:=public.relay_workspace_snapshot(jsonb_build_object('organization_id',org,'view','documents','page',1));
 if (v->>'total')::int<>52 or jsonb_array_length(v->'documents')<>2 then raise exception 'Company library pagination count incorrect';end if;
 v:=public.relay_workspace_snapshot(jsonb_build_object('organization_id',org,'view','documents','query','Fixture51.pdf'));
 if (v->>'total')::int<>1 or v->'documents'->0->>'name'<>'Fixture51.pdf' then raise exception 'Company document search is applied after pagination';end if;
 execute 'reset role';
end $test$;
rollback;
select 'document lifecycle checks passed' as result;
