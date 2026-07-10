-- Run this once in Supabase SQL Editor.
--
-- BADILIKO LA SERA (POLICY CHANGE): Sasa Salesperson HAWEZI kabisa
-- kuuza/kurekodi mauzo (App tayari imeondoa kitufe cha "+ New Sale" kwa
-- Salesperson) - Owner/Manager pekee ndio wanaorekodi mauzo. Vilevile
-- Salesperson hawezi kuongeza bidhaa wala kupunguza/kubadilisha stock kwa
-- njia yoyote (App tayari haina kitufe cha hilo kwenye Inventory).
--
-- Hii inasasisha RLS kwenye database ili kuendana KIKAMILIFU na sera hii
-- mpya - bila hii, ingawa App haionyeshi vitufe hivyo, mtu anayejua
-- kutumia Supabase moja kwa moja (si kupitia App) angeweza bado
-- kuuza/kupunguza stock kama Salesperson, kwa sababu Policy za zamani
-- zilikuwa zinamruhusu (kwa duka lake tu).

-- SALES: ondoa uwezo wa Salesperson kuongeza (insert) sale - Owner/Manager pekee
drop policy if exists sales_insert on sales;
create policy sales_insert on sales for insert to authenticated
  with check (my_role() in ('owner', 'manager'));

-- PRODUCTS: ondoa uwezo wa Salesperson kubadilisha (update) stock ya
-- duka lake - Owner/Manager pekee sasa ndio wanaoweza ku-update bidhaa
-- (Salesperson bado anaona bidhaa zote - SELECT haibadiliki).
drop policy if exists products_update on products;
create policy products_update on products for update to authenticated
  using (my_role() in ('owner', 'manager'))
  with check (my_role() in ('owner', 'manager'));

-- (Kama una Policy ya ziada "products_update_owner_manager_all" kutoka
-- fix_products_update_rls_owner_manager.sql, hiyo inaweza kubaki - haina
-- mgongano kwa sababu ina masharti yaleyale ya owner/manager.)
