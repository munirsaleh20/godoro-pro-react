-- Run this once in Supabase SQL Editor.
--
-- TATIZO: Salesperson bado anaweza ku-EDIT mauzo (sales), ingawa App
-- (frontend) haionyeshi kitufe cha ✏️ Edit kwa Salesperson - hii inaonyesha
-- tatizo lipo kwenye DATABASE (RLS/GRANT), si kwenye App.
--
-- SABABU INAYOWEZEKANA (moja au zote mbili):
--   1) Kuna Policy ya ZAMANI kwenye jedwali la `sales` yenye "using (true)"
--      kwa amri ya UPDATE ambayo bado ipo pamoja na Policy mpya sahihi -
--      Postgres huchanganya (OR) Policies zote za amri moja, hivyo Policy
--      ya zamani "inashinda" na kuruhusu kila mtu.
--   2) Jedwali la `sales` halina GRANT kamili kwa role ya "authenticated"
--      (tofauti na Policy - GRANT ni ruhusa ya awali kabisa).
--
-- FIX HII: inafuta (DROP) Policies ZOTE zilizopo sasa kwenye `sales`
-- (kuanza "clean slate" - hakuna Policy ya zamani itakayobaki kuchanganya),
-- kisha inaweka upya Policies sahihi TU, na inahakikisha GRANT ipo.

-- Hakikisha kazi ndogo ya my_role() ipo (ikiwa tayari ipo, hii inaibadilisha tu upya)
create or replace function my_role()
returns text
language sql stable security definer set search_path = public
as $$ select role from staff where id = auth.uid(); $$;

create or replace function my_location()
returns uuid
language sql stable security definer set search_path = public
as $$ select location_id from staff where id = auth.uid(); $$;

alter table sales enable row level security;

-- Futa Policies ZOTE zilizopo sasa kwenye `sales` (bila kujali majina yake)
do $$
declare
  pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'sales'::regclass loop
    execute format('drop policy if exists %I on sales', pol.polname);
  end loop;
end $$;

-- Weka upya Policies sahihi TU:
-- SELECT: Owner/Manager wanaona mauzo YOTE; Salesperson anaona ya duka lake tu
create policy sales_select on sales for select to authenticated
  using (my_role() in ('owner', 'manager') or location_id = my_location());

-- INSERT: Owner/Manager (popote); Salesperson (duka lake tu)
create policy sales_insert on sales for insert to authenticated
  with check (my_role() in ('owner', 'manager') or location_id = my_location());

-- UPDATE: Owner/Manager PEKEE
create policy sales_update on sales for update to authenticated
  using (my_role() in ('owner', 'manager')) with check (my_role() in ('owner', 'manager'));

-- DELETE: Owner/Manager PEKEE
create policy sales_delete on sales for delete to authenticated
  using (my_role() in ('owner', 'manager'));

-- Hakikisha GRANT ya msingi ipo pia (kama ilivyokuwa tatizo kwenye `transfers`)
grant select, insert, update, delete on table sales to authenticated;
