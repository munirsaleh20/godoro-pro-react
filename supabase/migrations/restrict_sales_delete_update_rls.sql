-- Run this once in Supabase SQL Editor.
--
-- TATIZO: Owner akifuta "sale", inaondoka kwenye screen yake papo hapo
-- (kwa sababu app inaiondoa kwenye orodha ya screen mara moja - "optimistic
-- update"), LAKINI kama kwenye database hakuna RLS Policy inayoruhusu
-- DELETE kwenye jedwali la `sales`, Supabase KIMYA KIMYA hairuhusu ufutaji
-- huo (haitupi error - inarudisha tu "rows 0 zilizoathirika"). Matokeo
-- yake: sale ile inabaki kwenye database, hivyo Salesperson bado anaiona,
-- na Owner akilogout/login tena (au ku-refresh) na yeye anaiona tena.
--
-- Hii inaongeza Policy sahihi inayoruhusu Owner na Manager PEKEE kufuta au
-- kuhariri (edit) mauzo. Salesperson ataendelea kuruhusiwa ku-ongeza
-- (insert) na kuona (select) mauzo, kama ilivyo sasa.

-- Kazi ndogo inayosoma role ya mtumiaji aliye-login sasa
create or replace function my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from staff where id = auth.uid();
$$;

alter table sales enable row level security;

drop policy if exists "sales_delete_owner_manager" on sales;
create policy "sales_delete_owner_manager"
  on sales for delete
  to authenticated
  using (my_role() in ('owner', 'manager'));

drop policy if exists "sales_update_owner_manager" on sales;
create policy "sales_update_owner_manager"
  on sales for update
  to authenticated
  using (my_role() in ('owner', 'manager'))
  with check (my_role() in ('owner', 'manager'));

-- KUMBUKA: Kama tayari una Policy nyingine kwenye `sales` yenye
-- "using (true)" kwa amri ya UPDATE au DELETE (inayoruhusu kila mtu),
-- Policy hiyo ya zamani itaendelea "kushinda" (Postgres huchanganya
-- Policies zote za amri moja kwa OR) - itabidi uifute (DROP) hiyo ya
-- zamani kwenye Supabase Dashboard -> Authentication -> Policies, ili hii
-- mpya ifanye kazi kikamilifu. Nitakusaidia kutambua jina lake ukiniambia
-- majina ya Policies zilizopo sasa kwenye jedwali la `sales`.
