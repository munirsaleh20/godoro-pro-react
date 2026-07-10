-- Run this once in Supabase SQL Editor.
--
-- Hii ni FIX ya moja kwa moja (Hatua 2 kutoka diagnose_products_update_rls.sql).
-- Inaongeza Policy inayoruhusu Owner/Manager ku-UPDATE bidhaa (products) za
-- LOCATION ZOTE (store na shops zote) - hii ndiyo inahitajika ili wakati
-- Owner anafuta "sale" iliyofanywa na salesperson mahali popote, stock ya
-- bidhaa husika iweze kurudishwa (increment) bila kuzuiwa na RLS.
--
-- Salesperson ataendelea kuruhusiwa ku-update stock ya duka lake pekee
-- (kama ilivyo sasa anapouza), Policy hii HAIONDOI hilo - inaongeza tu
-- ruhusa ya ziada kwa Owner/Manager.

alter table products enable row level security;

drop policy if exists "products_update_owner_manager_all" on products;
create policy "products_update_owner_manager_all"
  on products for update
  to authenticated
  using (my_role() in ('owner', 'manager'))
  with check (my_role() in ('owner', 'manager'));

-- KUMBUKA: Kama my_role() haipo bado kwenye database yako, kimbiza kwanza
-- sehemu hii (ipo pia kwenye restrict_sales_delete_update_rls.sql):
--
-- create or replace function my_role()
-- returns text
-- language sql
-- stable
-- security definer
-- set search_path = public
-- as $$
--   select role from staff where id = auth.uid();
-- $$;
