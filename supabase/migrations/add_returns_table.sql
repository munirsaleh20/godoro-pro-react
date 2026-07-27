-- Run this once in Supabase SQL Editor.
--
-- KIPENGELE KIPYA: "Returns / Exchanges" (Kurudisha bidhaa / Kubadilisha
-- bidhaa) - mteja anaporudisha godoro alilonunua (refund) au anapotaka
-- kubadilisha alilochukua na kuchukua jingine (exchange), tunahitaji: (1)
-- kurudisha stock ya bidhaa iliyorudishwa, (2) kama ni exchange, kutoa
-- stock ya bidhaa mpya aliyochukua, (3) kuhifadhi kumbukumbu ya tukio hilo
-- kwa ajili ya ripoti/audit - bila kufuta au kuharibu rekodi ya mauzo ya
-- awali.

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  original_sale_id uuid references public.sales(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  customer_name text,
  customer_phone text,
  type text not null check (type in ('return', 'exchange')),
  returned_product_id uuid references public.products(id) on delete set null,
  returned_name text not null,
  returned_size text,
  returned_quantity integer not null default 0,
  refund_amount numeric not null default 0, -- thamani ya bidhaa iliyorudishwa
  exchange_sale_id uuid references public.sales(id) on delete set null, -- rekodi mpya ya mauzo iliyoundwa (exchange pekee)
  exchange_product_id uuid references public.products(id) on delete set null,
  exchange_name text,
  exchange_size text,
  exchange_quantity integer,
  exchange_total numeric, -- thamani ya bidhaa mpya aliyochukua (exchange pekee)
  difference_amount numeric not null default 0, -- chanya = mteja analipa zaidi; hasi = arudishiwe pesa
  note text,
  recorded_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.returns is
  'Kumbukumbu ya kila godoro/bidhaa iliyorudishwa (refund) au kubadilishwa (exchange) na mteja - haibadilishi/kufuta sale ya awali, ni rekodi ya tukio.';

create index if not exists idx_returns_location on public.returns(location_id);
create index if not exists idx_returns_original_sale on public.returns(original_sale_id);
create index if not exists idx_returns_created_at on public.returns(created_at);

-- ---------------------------------------------------------------------
-- RLS: sawa na transfers/debts/expenses - Owner/Manager pekee ndio
-- wanaoruhusiwa kuandika/kufuta; SELECT inaruhusiwa kwa location yake kwa
-- salesperson, na yote kwa Owner/Manager.
-- ---------------------------------------------------------------------
alter table public.returns enable row level security;

drop policy if exists returns_select on public.returns;
create policy returns_select on public.returns for select to authenticated
  using (my_role() in ('owner', 'manager') or location_id = my_location());

drop policy if exists returns_insert on public.returns;
create policy returns_insert on public.returns for insert to authenticated
  with check (my_role() in ('owner', 'manager') or location_id = my_location());

drop policy if exists returns_update on public.returns;
create policy returns_update on public.returns for update to authenticated
  using (my_role() in ('owner', 'manager')) with check (my_role() in ('owner', 'manager'));

drop policy if exists returns_delete on public.returns;
create policy returns_delete on public.returns for delete to authenticated
  using (my_role() in ('owner', 'manager'));

grant select, insert, update, delete on table public.returns to authenticated;

-- KUMBUKA: hii inahitaji functions my_role() na my_location() ambazo
-- tayari zimeundwa na migration ya awali (fix_manager_visibility_and_role_rls.sql).
