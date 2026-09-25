-- Run once in the Supabase SQL editor. All application reads use the
-- publishable key and a signed-in user's JWT; there is no service key in the app.
create schema if not exists private;
grant usage on schema private to authenticated;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- SECURITY DEFINER keeps membership policies from recursively querying
-- themselves. The functions have a fixed empty search_path and only expose
-- boolean membership checks to authenticated callers.
create or replace function private.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_role(p_org uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = (select auth.uid())
      and m.role = any(p_roles)
  );
$$;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_role(uuid, text[]) to authenticated;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  location text not null default '',
  material text not null default '',
  email text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);
create unique index if not exists suppliers_org_lower_name
  on public.suppliers (org_id, lower(name));

create or replace function private.protect_supplier()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.org_id is distinct from old.org_id
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
    then raise exception 'Supplier ownership cannot be changed'; end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger protect_supplier before update on public.suppliers
  for each row execute function private.protect_supplier();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  category text not null check (category in ('Energy record', 'Production record', 'Precursor data')),
  period text not null check (period ~ '^20[0-9]{2}-Q[1-4]$'),
  filename text not null check (char_length(filename) between 1 and 240),
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  status text not null default 'Needs review' check (status in ('Needs review', 'Reviewed')),
  value text not null default '',
  unit text not null default '',
  source text not null default '',
  notes text not null default '',
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, supplier_id) references public.suppliers(org_id, id) on delete cascade,
  constraint document_path_org check (split_part(storage_path, '/', 1) = org_id::text)
);
create index if not exists documents_org_period on public.documents(org_id, period, created_at desc);
create unique index if not exists documents_one_filename_per_supplier_period
  on public.documents(org_id, supplier_id, period, filename);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index if not exists invitations_one_pending_per_email
  on public.organization_invitations(org_id, email) where accepted_at is null;

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  subject_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_org_time on public.audit_events(org_id, created_at desc);

create or replace function public.create_organization(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if (select auth.uid()) is null then raise exception 'Sign in first'; end if;
  if char_length(trim(p_name)) not between 2 and 100 then raise exception 'Invalid organization name'; end if;
  insert into public.organizations(name, created_by) values (trim(p_name), (select auth.uid())) returning id into v_org;
  insert into public.organization_members(org_id, user_id, email, role)
    values (v_org, (select auth.uid()), lower((select auth.jwt()->>'email')), 'owner');
  insert into public.audit_events(org_id, actor_id, action, subject_id)
    values (v_org, (select auth.uid()), 'organization.created', v_org);
  return v_org;
end;
$$;
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

create or replace function public.accept_invitation(p_invitation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inv public.organization_invitations%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Sign in first'; end if;
  select * into v_inv from public.organization_invitations
    where id = p_invitation_id and accepted_at is null for update;
  if not found then raise exception 'Invitation is no longer available'; end if;
  if v_inv.email <> lower(coalesce((select auth.jwt()->>'email'), ''))
    then raise exception 'Sign in with the invited email address'; end if;
  insert into public.organization_members(org_id, user_id, email, role)
    values (v_inv.org_id, (select auth.uid()), v_inv.email, v_inv.role)
    on conflict (org_id, user_id) do nothing;
  update public.organization_invitations set accepted_at = now() where id = p_invitation_id;
  insert into public.audit_events(org_id, actor_id, action, subject_id, details)
    values (v_inv.org_id, (select auth.uid()), 'invitation.accepted', p_invitation_id,
      jsonb_build_object('role', v_inv.role));
  return v_inv.org_id;
end;
$$;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

create or replace function public.set_member_role(p_org_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(p_org_id, array['owner']) then raise exception 'Only owners can change roles'; end if;
  if p_role not in ('admin', 'editor', 'viewer') then raise exception 'Invalid role'; end if;
  if not exists (select 1 from public.organization_members where org_id=p_org_id and user_id=p_user_id)
    then raise exception 'Member not found'; end if;
  if exists (select 1 from public.organization_members where org_id=p_org_id and user_id=p_user_id and role='owner')
    then raise exception 'The owner role cannot be changed here'; end if;
  update public.organization_members set role=p_role where org_id=p_org_id and user_id=p_user_id;
  insert into public.audit_events(org_id, actor_id, action, subject_id, details)
    values (p_org_id, (select auth.uid()), 'member.role_changed', p_user_id,
      jsonb_build_object('role', p_role));
end;
$$;
revoke all on function public.set_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

create or replace function public.remove_member(p_org_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_role text;
begin
  if not private.has_role(p_org_id, array['owner','admin']) then raise exception 'Only owners and admins can remove members'; end if;
  select role into v_role from public.organization_members where org_id=p_org_id and user_id=p_user_id;
  if v_role is null then raise exception 'Member not found'; end if;
  if v_role = 'owner' then raise exception 'The owner cannot be removed'; end if;
  if v_role = 'admin' and not private.has_role(p_org_id, array['owner'])
    then raise exception 'Only an owner can remove an admin'; end if;
  delete from public.organization_members where org_id=p_org_id and user_id=p_user_id;
  insert into public.audit_events(org_id, actor_id, action, subject_id)
    values (p_org_id, (select auth.uid()), 'member.removed', p_user_id);
end;
$$;
revoke all on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

create or replace function private.prepare_document()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.org_id is distinct from old.org_id
        or new.storage_path is distinct from old.storage_path
        or new.created_by is distinct from old.created_by
        or new.created_at is distinct from old.created_at
        or new.supplier_id is distinct from old.supplier_id
        or new.category is distinct from old.category
        or new.period is distinct from old.period
        or new.filename is distinct from old.filename
        or new.mime_type is distinct from old.mime_type
        or new.size_bytes is distinct from old.size_bytes then
      raise exception 'Source document metadata cannot be changed';
    end if;
  end if;
  if new.status = 'Reviewed' then
    if trim(new.value) !~ '^[0-9]+([.][0-9]+)?$'
        or char_length(trim(new.unit)) not between 1 and 40
        or char_length(trim(new.source)) not between 1 and 300
      then raise exception 'A reviewed document needs a non-negative value, unit, and source'; end if;
    if tg_op = 'INSERT' then
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
    elsif old.status is distinct from 'Reviewed' or old.value is distinct from new.value
      or old.unit is distinct from new.unit or old.source is distinct from new.source then
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
    else
      new.reviewed_by := old.reviewed_by;
      new.reviewed_at := old.reviewed_at;
    end if;
  else
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;
create trigger prepare_document before insert or update on public.documents
  for each row execute function private.prepare_document();

create or replace function private.audit_workspace_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_row record;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;
  insert into public.audit_events(org_id, actor_id, action, subject_id, details)
    values (v_row.org_id, (select auth.uid()), lower(tg_table_name) || '.' || lower(tg_op), v_row.id,
      case when tg_table_name = 'documents'
           then jsonb_build_object('status', to_jsonb(v_row)->>'status', 'filename', to_jsonb(v_row)->>'filename')
           when tg_table_name = 'organization_invitations'
           then jsonb_build_object('email', to_jsonb(v_row)->>'email', 'role', to_jsonb(v_row)->>'role')
           else jsonb_build_object('name', to_jsonb(v_row)->>'name') end);
  return v_row;
end;
$$;
create trigger audit_supplier after insert or update or delete on public.suppliers
  for each row execute function private.audit_workspace_change();
create trigger audit_document after insert or update or delete on public.documents
  for each row execute function private.audit_workspace_change();
create trigger audit_invitation after insert or delete on public.organization_invitations
  for each row execute function private.audit_workspace_change();

create or replace function private.audit_organization_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
    then raise exception 'Organization ownership cannot be changed'; end if;
  new.updated_at := now();
  insert into public.audit_events(org_id, actor_id, action, subject_id, details)
    values (new.id, (select auth.uid()), 'organization.updated', new.id,
      jsonb_build_object('name', new.name));
  return new;
end;
$$;
create trigger audit_organization before update on public.organizations
  for each row execute function private.audit_organization_update();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.suppliers enable row level security;
alter table public.documents enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.audit_events enable row level security;

grant select, update on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, delete on public.organization_invitations to authenticated;
grant select on public.audit_events to authenticated;

create policy org_read on public.organizations for select to authenticated
  using (private.is_member(id));
create policy org_update on public.organizations for update to authenticated
  using (private.has_role(id, array['owner','admin']))
  with check (private.has_role(id, array['owner','admin']));
create policy members_read on public.organization_members for select to authenticated
  using (private.is_member(org_id));
create policy suppliers_read on public.suppliers for select to authenticated
  using (private.is_member(org_id));
create policy suppliers_insert on public.suppliers for insert to authenticated
  with check (private.has_role(org_id, array['owner','admin','editor']) and created_by = (select auth.uid()));
create policy suppliers_update on public.suppliers for update to authenticated
  using (private.has_role(org_id, array['owner','admin','editor']))
  with check (private.has_role(org_id, array['owner','admin','editor']));
create policy suppliers_delete on public.suppliers for delete to authenticated
  using (private.has_role(org_id, array['owner','admin']));
create policy documents_read on public.documents for select to authenticated
  using (private.is_member(org_id));
create policy documents_insert on public.documents for insert to authenticated
  with check (private.has_role(org_id, array['owner','admin','editor']) and created_by = (select auth.uid()));
create policy documents_update on public.documents for update to authenticated
  using (private.has_role(org_id, array['owner','admin','editor']))
  with check (private.has_role(org_id, array['owner','admin','editor']));
create policy documents_delete on public.documents for delete to authenticated
  using (private.has_role(org_id, array['owner','admin']));
create policy invitations_read on public.organization_invitations for select to authenticated
  using (private.has_role(org_id, array['owner','admin'])
    or email = lower(coalesce((select auth.jwt()->>'email'), '')));
create policy invitations_insert on public.organization_invitations for insert to authenticated
  with check (private.has_role(org_id, array['owner','admin']) and created_by = (select auth.uid()));
create policy invitations_delete on public.organization_invitations for delete to authenticated
  using (private.has_role(org_id, array['owner','admin']));
create policy audit_read on public.audit_events for select to authenticated
  using (private.is_member(org_id));

insert into storage.buckets (id, name, public, file_size_limit)
values ('org-evidence', 'org-evidence', false, 10485760)
on conflict (id) do update set public=false, file_size_limit=10485760;
create policy evidence_read on storage.objects for select to authenticated
  using (bucket_id='org-evidence' and private.is_member(((storage.foldername(name))[1])::uuid));
create policy evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id='org-evidence' and private.has_role(((storage.foldername(name))[1])::uuid,
    array['owner','admin','editor']) and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy evidence_delete on storage.objects for delete to authenticated
  using (bucket_id='org-evidence' and (
    private.has_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
    or (private.has_role(((storage.foldername(name))[1])::uuid, array['editor'])
      and (storage.foldername(name))[2] = (select auth.uid())::text)
  ));
