-- Run this once in Supabase SQL Editor.
--
-- KIPENGELE KIPYA: "Wholesale" (Jumla) - kwa maduka yanayopewa mzigo kwa
-- MKOPO (si mauzo ya kawaida ya mteja mmoja-mmoja). Wanachukua bidhaa,
-- wanauza kwa wateja wao, kisha wanarejesha pesa kwa AWAMU (installments) -
-- na wanaweza kuendelea kuchukua mzigo mpya hata kama bado hawajamaliza
-- kulipa deni la mzigo uliopita. Kila duka la jumla ni kama "sheet" moja
-- (kama Excel), na kila mzigo/malipo ni mstari mpya kwenye sheet hiyo -
-- deni (balance) linahesabiwa moja kwa moja kutoka kwenye jumla ya
-- miamala yote (goods - payments), si safu tofauti inayoweza kupitwa.

-- 1) Wholesale customers (maduka ya jumla / "sheets")
create table if not exists public.wholesale_customers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  notes text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.wholesale_customers is
  'Maduka/wateja wa jumla (wholesale) wanaochukua mzigo kwa mkopo kutoka kwenye duka/store letu.';

-- 2) Wholesale transactions (mstari mmoja mmoja kwenye "sheet" ya kila duka)
create table if not exists public.wholesale_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.wholesale_customers(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  type text not null check (type in ('goods', 'payment')),
  description text,
  items jsonb, -- kwa type='goods': [{ productId, name, size, quantity, unitPrice }]
  amount numeric not null default 0, -- goods: thamani ya mzigo (inaongeza deni); payment: kiasi kilicholipwa (inapunguza deni)
  date date not null default current_date,
  recorded_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.wholesale_transactions is
  'Ledger ya kila duka la jumla: mzigo uliopewa (goods, unaoongeza deni) na malipo yaliyorejeshwa (payment, yanayopunguza deni). Deni la sasa = jumla ya goods - jumla ya payments.';

create index if not exists idx_wholesale_transactions_customer on public.wholesale_transactions(customer_id);
create index if not exists idx_wholesale_transactions_location on public.wholesale_transactions(location_id);

-- ---------------------------------------------------------------------
-- RLS: sheria ileile inayotumika kwa debts/expenses/sales kwenye app hii -
-- Owner/Manager wanaona na kudhibiti kila kitu; Salesperson anaona na
-- anaongeza kwa DUKA LAKE tu, lakini hawezi kuhariri/kufuta (hilo ni kazi
-- ya Owner/Manager pekee kwa usalama wa kumbukumbu).
-- ---------------------------------------------------------------------
alter table public.wholesale_customers enable row level security;
alter table public.wholesale_transactions enable row level security;

drop policy if exists wholesale_customers_select on public.wholesale_customers;
create policy wholesale_customers_select on public.wholesale_customers for select to authenticated
  using (my_role() in ('owner','manager') or location_id = my_location());

drop policy if exists wholesale_customers_insert on public.wholesale_customers;
create policy wholesale_customers_insert on public.wholesale_customers for insert to authenticated
  with check (my_role() in ('owner','manager') or location_id = my_location());

drop policy if exists wholesale_customers_update on public.wholesale_customers;
create policy wholesale_customers_update on public.wholesale_customers for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));

drop policy if exists wholesale_customers_delete on public.wholesale_customers;
create policy wholesale_customers_delete on public.wholesale_customers for delete to authenticated
  using (my_role() in ('owner','manager'));

drop policy if exists wholesale_transactions_select on public.wholesale_transactions;
create policy wholesale_transactions_select on public.wholesale_transactions for select to authenticated
  using (my_role() in ('owner','manager') or location_id = my_location());

drop policy if exists wholesale_transactions_insert on public.wholesale_transactions;
create policy wholesale_transactions_insert on public.wholesale_transactions for insert to authenticated
  with check (my_role() in ('owner','manager') or location_id = my_location());

drop policy if exists wholesale_transactions_update on public.wholesale_transactions;
create policy wholesale_transactions_update on public.wholesale_transactions for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));

drop policy if exists wholesale_transactions_delete on public.wholesale_transactions;
create policy wholesale_transactions_delete on public.wholesale_transactions for delete to authenticated
  using (my_role() in ('owner','manager'));

-- KUMBUKA: hii inahitaji functions my_role() na my_location() ambazo
-- tayari zimeundwa na migration ya awali (fix_manager_visibility_and_role_rls.sql).
-- Kama bado hujaendesha hiyo, iendeshe kwanza kabla ya hii.
