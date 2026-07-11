-- Run this once in Supabase SQL Editor (BAADA ya add_wholesale_tables.sql).
--
-- Salesperson HATAKIWI kuona wala kugusa kitu chochote kuhusu Wholesale -
-- si kwenye sidebar tu (App), bali hata kama mtu angejaribu kuomba data
-- moja kwa moja kupitia API/Supabase client. Hii inabadilisha Policies za
-- wholesale_customers na wholesale_transactions ili ziwe Owner/Manager
-- PEKEE kwa amri zote (select/insert/update/delete) - Salesperson
-- hataona hata mstari mmoja, hata wa duka lake mwenyewe.

drop policy if exists wholesale_customers_select on public.wholesale_customers;
create policy wholesale_customers_select on public.wholesale_customers for select to authenticated
  using (my_role() in ('owner','manager'));

drop policy if exists wholesale_customers_insert on public.wholesale_customers;
create policy wholesale_customers_insert on public.wholesale_customers for insert to authenticated
  with check (my_role() in ('owner','manager'));

drop policy if exists wholesale_customers_update on public.wholesale_customers;
create policy wholesale_customers_update on public.wholesale_customers for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));

drop policy if exists wholesale_customers_delete on public.wholesale_customers;
create policy wholesale_customers_delete on public.wholesale_customers for delete to authenticated
  using (my_role() in ('owner','manager'));

drop policy if exists wholesale_transactions_select on public.wholesale_transactions;
create policy wholesale_transactions_select on public.wholesale_transactions for select to authenticated
  using (my_role() in ('owner','manager'));

drop policy if exists wholesale_transactions_insert on public.wholesale_transactions;
create policy wholesale_transactions_insert on public.wholesale_transactions for insert to authenticated
  with check (my_role() in ('owner','manager'));

drop policy if exists wholesale_transactions_update on public.wholesale_transactions;
create policy wholesale_transactions_update on public.wholesale_transactions for update to authenticated
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));

drop policy if exists wholesale_transactions_delete on public.wholesale_transactions;
create policy wholesale_transactions_delete on public.wholesale_transactions for delete to authenticated
  using (my_role() in ('owner','manager'));
