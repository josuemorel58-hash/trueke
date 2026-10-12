-- Ejecutar en SQL Editor de Supabase. No modifica tablas de Refrigerio.
begin;
create table if not exists public.trueke_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create table if not exists public.trueke_sync_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  primary key (user_id, operation_id)
);
alter table public.trueke_records enable row level security;
alter table public.trueke_sync_receipts enable row level security;
drop policy if exists trueke_records_own on public.trueke_records;
create policy trueke_records_own on public.trueke_records for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.trueke_records, public.trueke_sync_receipts from anon, authenticated;
grant select on public.trueke_records to authenticated;

-- El usuario se obtiene del JWT, nunca de un ID enviado por el cliente.
-- Los recibos hacen idempotente un reintento cuya respuesta se perdió.
create or replace function public.trueke_sync(operations jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); op jsonb; inserted integer; result jsonb;
begin
  if uid is null then raise exception 'Se requiere sesión' using errcode = '42501'; end if;
  if jsonb_typeof(operations) <> 'array' or jsonb_array_length(operations) > 100 then
    raise exception 'Lote inválido';
  end if;
  -- Serializa lotes de una misma cuenta, incluso desde distintos teléfonos.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  for op in select value from jsonb_array_elements(operations) loop
    if not (op ? 'id' and op ? 'key' and op ? 'value') or
       length(op->>'key') > 220 or
       not ((op->>'key') ~ '^(profile/(firstName|lastName|phone|location|bio|photo|coordinates)|favorite/[^/]+|item/[^/]+|message/[^/]+|history/[^/]+|setting/nearbyOnly)$') or
       octet_length(op::text) > 100000 then raise exception 'Operación inválida'; end if;
    insert into public.trueke_sync_receipts values (uid, (op->>'id')::uuid) on conflict do nothing;
    get diagnostics inserted = row_count;
    if inserted = 1 then
      insert into public.trueke_records(user_id, key, value) values (uid, op->>'key', op->'value')
      on conflict (user_id, key) do update set value = excluded.value, updated_at = now();
    end if;
  end loop;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into result from public.trueke_records where user_id = uid;
  return result;
end;
$$;
revoke all on function public.trueke_sync(jsonb) from public, anon;
grant execute on function public.trueke_sync(jsonb) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('trueke-private', 'trueke-private', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;
drop policy if exists trueke_photo_read on storage.objects;
create policy trueke_photo_read on storage.objects for select to authenticated
using (bucket_id = 'trueke-private' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists trueke_photo_insert on storage.objects;
create policy trueke_photo_insert on storage.objects for insert to authenticated
with check (bucket_id = 'trueke-private' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists trueke_photo_update on storage.objects;
create policy trueke_photo_update on storage.objects for update to authenticated
using (bucket_id = 'trueke-private' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'trueke-private' and (storage.foldername(name))[1] = (select auth.uid()::text));
commit;
