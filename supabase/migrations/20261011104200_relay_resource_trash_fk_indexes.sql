-- Cover composite references for parent-row updates/deletes as well as paged Trash reads.
create index document_trash_resource_fk_idx on relay_private.document_trash(organization_id,document_id);
create index requirement_trash_resource_fk_idx on relay_private.requirement_trash(organization_id,requirement_id);
