-- Bind each evidence row to the actual uploaded object. A path alone allowed an
-- original to be deleted and replaced while its review remained unchanged.
alter table public.documents add column storage_object_id uuid;

update public.documents d set storage_object_id = o.id
from storage.objects o
where o.bucket_id = 'org-evidence' and o.name = d.storage_path;

-- Fail rather than silently certifying legacy rows whose source is missing.
alter table public.documents alter column storage_object_id set not null;
alter table public.documents add constraint documents_storage_object_fk
  foreign key (storage_object_id) references storage.objects(id) on delete restrict;
create unique index documents_one_source_object on public.documents(storage_object_id);

create or replace function private.link_document_object()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_object record;
begin
  if tg_op = 'UPDATE' then
    if new.storage_object_id is distinct from old.storage_object_id then
      raise exception 'The original evidence object cannot be changed';
    end if;
    return new;
  end if;

  if split_part(new.storage_path, '/', 1) <> new.org_id::text
      or split_part(new.storage_path, '/', 2) <> new.created_by::text then
    raise exception 'Source path must belong to this organisation and uploader';
  end if;

  -- The row lock and FK close the race between registering a document and
  -- deleting an unregistered upload. Storage deletes its DB row before bytes.
  select o.id, o.metadata, coalesce(o.owner_id, o.owner::text) as uploader
    into v_object from storage.objects o
    where o.bucket_id = 'org-evidence' and o.name = new.storage_path
    for key share;
  if not found then raise exception 'Upload the original file before saving its record'; end if;
  if v_object.uploader is distinct from new.created_by::text then
    raise exception 'The source file must belong to its recorded uploader';
  end if;
  if (v_object.metadata->>'size')::bigint is distinct from new.size_bytes::bigint then
    raise exception 'The recorded file size must match the original upload';
  end if;
  new.storage_object_id := v_object.id;
  return new;
end;
$$;
revoke all on function private.link_document_object() from public, anon, authenticated;
create trigger link_document_object before insert or update on public.documents
  for each row execute function private.link_document_object();

drop policy evidence_delete on storage.objects;
create policy evidence_delete on storage.objects for delete to authenticated
  using (bucket_id = 'org-evidence'
    and not exists (select 1 from public.documents d where d.storage_object_id = storage.objects.id)
    and (
      private.has_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
      or (private.has_role(((storage.foldername(name))[1])::uuid, array['editor'])
        and (storage.foldername(name))[2] = (select auth.uid())::text)
    ));
