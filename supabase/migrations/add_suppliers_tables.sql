-- Run this once in Supabase SQL Editor.
--
-- KIPENGELE KIPYA: "Suppliers" (Viwanda/Wasambazaji) - KINYUME cha
-- Wholesale. Hapa TUNAPOKEA mzigo kwa MKOPO kutoka kiwandani (mfano
-- mzigo wa TZS 1,000,000), kisha tunaurudisha (kulipa) kidogo kidogo huku
-- tukiendelea kuuza. Kama Wholesale, kila kiwanda ni "sheet" moja, na kila
-- mzigo uliopokelewa/malipo ni mstari mpya - deni linalodaiwa NA sisi
-- (tunalowadai wenyewe kiwanda) linahesabiwa kutoka miamala yote:
-- jumla ya mizigo iliyopokelewa (stock_in) - jumla ya malipo (payments).
--
-- TOFAUTI MUHIMU na Wholesale: mzigo unaopokelewa kwa njia hii unatakiwa
-- UGAWIWE kwenye duka/store fulani (location_id kwenye kila "stock_in"),
-- na hii INAONGEZA stock ya bidhaa husika huko (kinyume cha Wholesale
-- ambako stock INAPUNGUA). Kiwanda chenyewe (supplier) si cha duka moja -
-- kinaweza kupeleka mzigo kwenye maduka tofauti kwa nyakati tofauti, hivyo
-- jedwali la 'suppliers' HALINA location_id maalum - location huwekwa kwa
-- kila 'stock_in' transaction badala yake.

-- 1) Suppliers (viwanda / wasambazaji - "sheets")
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.suppliers is
  'Viwanda/wasambazaji tunaowapokea mzigo kwa mkopo (accounts payable).';

-- 2) Supplier transactions (mstari mmoja mmoja kwenye "sheet" ya kila kiwanda)
create table if not exists public.supplier_transactions (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null, -- duka lililopokea mzigo (stock_in pekee)
  type text not null check (type in ('stock_in', 'payment')),
  description text,
  items jsonb, -- kwa type='stock_in': [{ productId, name, size, brand, cat, quantity, buyPrice, sellPrice }]
  amount numeric not null default 0, -- stock_in: thamani ya mzigo (inaongeza deni tunalowadai); payment: kiasi tulicholipa (inapunguza deni)
  date date not null default current_date,
  recorded_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.supplier_transactions is
  'Ledger ya kila kiwanda: mzigo tuliopokea (stock_in, unaoongeza deni tunalodaiwa) na malipo tuliyorejesha (payment, yanayopunguza deni). Deni la sasa = jumla ya stock_in - jumla ya payments.';

create index if not exists idx_supplier_transactions_supplier on public.supplier_transactions(supplier_id);
create index if not exists idx_supplier_transactions_location on public.supplier_transactions(location_id);

-- ---------------------------------------------------------------------
-- RLS: Owner/Manager PEKEE - manunuzi na madeni tunayodaiwa na viwanda ni
-- taarifa za kifedha za usimamizi, sawa na Wholesale (baada ya kuifunga
-- kwa Salesperson) na Transfers/Reports. Salesperson hataona kabisa.
-- ---------------------------------------------------------------------
alter table public.suppliers enable row level security;
alter table public.supplier_transactions enable row level security;

drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers for select to authenticated
  using (my_role() in ('owner','manager'));

drop policy if exists suppliers_insert on public.suppliers;
create policy suppliers_insert on public.suppliers for insert to authenticated
  with check (my_role() in ('owner','manager'));

drop policy if exists suppliers_update on public.suppliers;
create policy suppliers_update on public.suppliers for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));

drop policy if exists suppliers_delete on public.suppliers;
create policy suppliers_delete on public.suppliers for delete to authenticated
  using (my_role() in ('owner','manager'));

drop policy if exists supplier_transactions_select on public.supplier_transactions;
create policy supplier_transactions_select on public.supplier_transactions for select to authenticated
  using (my_role() in ('owner','manager'));

drop policy if exists supplier_transactions_insert on public.supplier_transactions;
create policy supplier_transactions_insert on public.supplier_transactions for insert to authenticated
  with check (my_role() in ('owner','manager'));

drop policy if exists supplier_transactions_update on public.supplier_transactions;
create policy supplier_transactions_update on public.supplier_transactions for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));

drop policy if exists supplier_transactions_delete on public.supplier_transactions;
create policy supplier_transactions_delete on public.supplier_transactions for delete to authenticated
  using (my_role() in ('owner','manager'));

-- KUMBUKA: hii inahitaji function my_role() ambayo tayari imeundwa na
-- migration ya awali (fix_manager_visibility_and_role_rls.sql).
