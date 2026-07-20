-- Run this once in Supabase SQL Editor.
--
-- KIPENGELE: "Edit" rekodi ya inventory_logs (badilisha Qty au Unit Price
-- ya bidhaa iliyoongezwa) kutoka kwenye "Muhtasari wa Bidhaa Zilizoongezwa
-- kwa Siku" (Inventory Daily Summary) - awali jedwali hili lilikuwa na
-- GRANT ya select/insert/delete pekee, sio update.

grant update on table public.inventory_logs to authenticated;

drop policy if exists inventory_logs_update on public.inventory_logs;
create policy inventory_logs_update on public.inventory_logs for update to authenticated
  using (my_role() in ('owner', 'manager'))
  with check (my_role() in ('owner', 'manager'));
