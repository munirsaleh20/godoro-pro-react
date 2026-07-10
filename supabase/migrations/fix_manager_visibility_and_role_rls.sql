-- ==========================================================================
-- FIX KAMILI: Manager mpya haoni chochote (Staff, Inventory, Expenses,
-- Debts, Sales, Dashboard = 0)
--
-- SABABU: Manager (tofauti na Salesperson) hana "location_id" maalum
-- (ni null - kwa sababu Manager anatakiwa aone locations ZOTE, kama Owner).
-- Lakini Policies za zamani za database (RLS) zilizokuwepo huenda
-- zilikuwa zinaruhusu "role = owner" pekee kuona kila kitu, na kumsahau
-- Manager - au zilikuwa zinalinganisha location_id ya mtumiaji na ya
-- rekodi (ambayo kwa Manager ni null, hivyo haifanani na chochote).
-- Matokeo: Manager anaingia (login inafanya kazi) lakini data zote
-- zinarudi TUPU kimya kimya (si error - RLS ikizuia SELECT, unapata
-- orodha tupu tu, sio error).
--
-- HII INAWEKA UPYA (KUANZIA ZERO) SHERIA MOJA THABITI KWA MAJEDWALI YOTE:
--   - Owner na Manager  -> wanaona na kudhibiti KILA KITU (locations zote)
--   - Salesperson        -> anaona/anaongeza tu kwenye duka lake (location_id
--                           yake), na HAWEZI kuhariri (update) wala kufuta
--                           (delete) sales/debts/expenses (hilo ni kazi ya
--                           Owner/Manager pekee - kama App tayari inavyoonyesha)
--
-- MUHIMU: Hii itafuta (DROP) Policies ZOTE zilizopo sasa kwenye majedwali
-- haya 7 (locations, products, sales, staff, debts, expenses, transfers)
-- na kuanza upya kimoja kimoja - ili tusiwe na Policy za zamani zinazogongana
-- kimya kimya na hizi mpya. "Profit" haihusiani na hii - hiyo inadhibitiwa
-- kwenye App yenyewe (Reports page - Owner pekee), sio kwenye database.
-- ==========================================================================

-- Kazi ndogo (helper functions) zinazosoma taarifa za mtumiaji aliye-login
create or replace function my_role()
returns text
language sql stable security definer set search_path = public
as $$ select role from staff where id = auth.uid(); $$;

create or replace function my_location()
returns uuid
language sql stable security definer set search_path = public
as $$ select location_id from staff where id = auth.uid(); $$;

-- Futa Policies ZOTE zilizopo sasa kwenye majedwali haya (kuanza kwenye "clean slate")
do $$
declare
  pol record;
  tbl text;
begin
  foreach tbl in array array['locations','products','sales','staff','debts','expenses','transfers'] loop
    for pol in select polname from pg_policy where polrelid = tbl::regclass loop
      execute format('drop policy if exists %I on %I', pol.polname, tbl);
    end loop;
  end loop;
end $$;

alter table locations enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table staff enable row level security;
alter table debts enable row level security;
alter table expenses enable row level security;
alter table transfers enable row level security;

-- STAFF: kila mtu anajiona mwenyewe; Owner/Manager wanaona/wanadhibiti wote
create policy staff_select on staff for select to authenticated
  using (id = auth.uid() or my_role() in ('owner','manager'));
create policy staff_insert on staff for insert to authenticated
  with check (my_role() in ('owner','manager'));
create policy staff_update on staff for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));
create policy staff_delete on staff for delete to authenticated
  using (my_role() in ('owner','manager'));

-- LOCATIONS: kila mtu anaona orodha ya maduka (inahitajika kwa dropdowns/search);
-- Owner/Manager pekee wanaongeza/kuhariri/kufuta duka
create policy locations_select on locations for select to authenticated using (true);
create policy locations_insert on locations for insert to authenticated
  with check (my_role() in ('owner','manager'));
create policy locations_update on locations for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));
create policy locations_delete on locations for delete to authenticated
  using (my_role() in ('owner','manager'));

-- PRODUCTS: kila mtu anaona bidhaa zote (search/locator); Owner/Manager
-- wanaongeza/kufuta; stock inaweza kubadilishwa (update) na Owner/Manager
-- (kokote), au na Salesperson KWA DUKA LAKE TU (anapouza/anapofutiwa sale
-- na Owner/Manager stock inarudi)
create policy products_select on products for select to authenticated using (true);
create policy products_insert on products for insert to authenticated
  with check (my_role() in ('owner','manager'));
create policy products_update on products for update to authenticated
  using (my_role() in ('owner','manager') or location_id = my_location())
  with check (my_role() in ('owner','manager') or location_id = my_location());
create policy products_delete on products for delete to authenticated
  using (my_role() in ('owner','manager'));

-- SALES: Owner/Manager wanaona/wanadhibiti mauzo YOTE; Salesperson
-- anaona/anaongeza mauzo ya DUKA LAKE tu, na HAWEZI kuhariri/kufuta
create policy sales_select on sales for select to authenticated
  using (my_role() in ('owner','manager') or location_id = my_location());
create policy sales_insert on sales for insert to authenticated
  with check (my_role() in ('owner','manager') or location_id = my_location());
create policy sales_update on sales for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));
create policy sales_delete on sales for delete to authenticated
  using (my_role() in ('owner','manager'));

-- DEBTS: sawa kabisa na sales (deni linatengenezwa kiotomatiki kila sale
-- ya deni inapofanyika, hivyo Salesperson anahitaji insert kwa duka lake)
create policy debts_select on debts for select to authenticated
  using (my_role() in ('owner','manager') or location_id = my_location());
create policy debts_insert on debts for insert to authenticated
  with check (my_role() in ('owner','manager') or location_id = my_location());
create policy debts_update on debts for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));
create policy debts_delete on debts for delete to authenticated
  using (my_role() in ('owner','manager'));

-- EXPENSES: Salesperson anaona TU matumizi ya duka lake (hawezi kuongeza/
-- kuhariri/kufuta - hilo ni la Owner/Manager pekee kwenye App)
create policy expenses_select on expenses for select to authenticated
  using (my_role() in ('owner','manager') or location_id = my_location());
create policy expenses_insert on expenses for insert to authenticated
  with check (my_role() in ('owner','manager'));
create policy expenses_update on expenses for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));
create policy expenses_delete on expenses for delete to authenticated
  using (my_role() in ('owner','manager'));

-- TRANSFERS: Owner/Manager pekee (uhamishaji wa stock kati ya maduka)
create policy transfers_select on transfers for select to authenticated
  using (my_role() in ('owner','manager'));
create policy transfers_insert on transfers for insert to authenticated
  with check (my_role() in ('owner','manager'));
create policy transfers_update on transfers for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));
create policy transfers_delete on transfers for delete to authenticated
  using (my_role() in ('owner','manager'));
