-- Base online de Refrigerio (Supabase/PostgreSQL)
-- Ejecuta este archivo en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  cantidad numeric not null default 1,
  unidad text not null default 'unidad',
  categoria text,
  codigo_barras text,
  fecha_compra date,
  fecha_vencimiento date,
  precio numeric,
  estado text not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lista_compras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  cantidad numeric not null default 1,
  unidad text not null default 'unidad',
  comprado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.alimentos enable row level security;
alter table public.lista_compras enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "alimentos_select_own"
on public.alimentos for select
using (auth.uid() = user_id);

create policy "alimentos_insert_own"
on public.alimentos for insert
with check (auth.uid() = user_id);

create policy "alimentos_update_own"
on public.alimentos for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "alimentos_delete_own"
on public.alimentos for delete
using (auth.uid() = user_id);

create policy "compras_select_own"
on public.lista_compras for select
using (auth.uid() = user_id);

create policy "compras_insert_own"
on public.lista_compras for insert
with check (auth.uid() = user_id);

create policy "compras_update_own"
on public.lista_compras for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "compras_delete_own"
on public.lista_compras for delete
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
