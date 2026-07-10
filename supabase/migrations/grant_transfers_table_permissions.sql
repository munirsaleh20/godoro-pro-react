-- Run this once in Supabase SQL Editor.
--
-- FIX: "permission denied for table transfers" wakati wa ku-EDIT au
-- KUFUTA (delete) uhamisho (transfer).
--
-- SABABU: Row Level Security (RLS) Policies za transfers (transfers_select,
-- transfers_insert, transfers_update, transfers_delete - angalia
-- fix_manager_visibility_and_role_rls.sql) tayari ni SAHIHI. Lakini
-- Policies pekee HAZITOSHI - Postgres kwanza inaangalia kama role ya
-- "authenticated" ina ruhusa za MSINGI (table-level GRANT) kwenye
-- jedwali husika KABLA hata haijaangalia Policy yoyote. Jedwali la
-- "transfers" halikupata GRANT kamili (UPDATE/DELETE) wakati fulani -
-- labda liliundwa kwa amri ya SQL moja kwa moja badala ya Table Editor
-- ya Supabase (ambayo huwa inaongeza GRANT hizi kiotomatiki) - hivyo
-- Postgres inakataa ombi mapema kabisa na ujumbe "permission denied for
-- table transfers", kabla hata Policy haijafikiwa.
--
-- Hii inaongeza GRANT zinazokosekana bila kubadilisha Policies zilizopo
-- (ambazo tayari zinazuia kwa usahihi: Owner/Manager pekee).

grant select, insert, update, delete on table transfers to authenticated;

-- Ukiwa hapa, hakikisha Policies za transfers bado zipo sahihi (Owner/Manager
-- pekee) - hii haiathiri chochote kama tayari zipo, ni kuhakikisha tu.
alter table transfers enable row level security;

drop policy if exists transfers_select on transfers;
create policy transfers_select on transfers for select to authenticated
  using (my_role() in ('owner', 'manager'));

drop policy if exists transfers_insert on transfers;
create policy transfers_insert on transfers for insert to authenticated
  with check (my_role() in ('owner', 'manager'));

drop policy if exists transfers_update on transfers;
create policy transfers_update on transfers for update to authenticated
  using (my_role() in ('owner', 'manager')) with check (my_role() in ('owner', 'manager'));

drop policy if exists transfers_delete on transfers;
create policy transfers_delete on transfers for delete to authenticated
  using (my_role() in ('owner', 'manager'));
