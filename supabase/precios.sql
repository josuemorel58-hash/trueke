-- Ejecuta una sola vez en Supabase > SQL Editor.
-- Los precios son aportes de usuarios; no representan cotizaciones oficiales.
create table if not exists public.precios_reportados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  producto text not null check (char_length(btrim(producto)) between 2 and 100),
  marca text not null check (char_length(btrim(marca)) between 1 and 70),
  presentacion text not null check (char_length(btrim(presentacion)) between 1 and 50),
  supermercado text not null check (char_length(btrim(supermercado)) between 2 and 80),
  sucursal text not null check (char_length(btrim(sucursal)) between 2 and 80),
  ciudad text not null check (char_length(btrim(ciudad)) between 2 and 80),
  precio_dop numeric(10,2) not null check (precio_dop > 0 and precio_dop < 1000000),
  reportado_at timestamptz not null default now()
);

create index if not exists precios_reportados_recientes
  on public.precios_reportados (reportado_at desc);

alter table public.precios_reportados enable row level security;

create policy "precios_leer_autenticados"
  on public.precios_reportados for select to authenticated
  using (true);

create policy "precios_crear_propios"
  on public.precios_reportados for insert to authenticated
  with check (
    auth.uid() = user_id
    and reportado_at between now() - interval '5 minutes' and now() + interval '5 minutes'
  );

create policy "precios_borrar_propios"
  on public.precios_reportados for delete to authenticated
  using (auth.uid() = user_id);
