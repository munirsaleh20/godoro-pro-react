-- FIX: Owner wa kwanza kushindwa kujisajili baada ya data kusafishwa.
--
-- SABABU: Policy ya zamani "staff_insert" inasema mtu anaweza ku-insert
-- kwenye staff TU kama my_role() (yaani role yake MWENYEWE iliyopo
-- tayari kwenye staff) ni 'owner' au 'manager'. Lakini owner wa kwanza
-- kabisa hana rekodi ya staff bado wakati anajaribu kujiongeza - hivyo
-- my_role() inarudisha NULL na insert inazuiwa na RLS (chicken-and-egg).
--
-- Hii inaongeza Policy ya ZIADA (Policies za INSERT zinaunganishwa kwa
-- "OR" - hii haiondoi ile ya zamani, inaongeza njia mpya): inaruhusu
-- mtumiaji aliyeingia (authenticated) kujiongeza MWENYEWE kama role='owner'
-- MRADI TU hakuna owner mwingine yeyote aliyepo tayari kwenye jedwali.
-- Mara owner wa kwanza akishaundwa, njia hii inafungwa kiotomatiki kwa
-- watumiaji wengine wote (kwa sababu "not exists owner" itakuwa false).

create policy staff_insert_first_owner on staff for insert to authenticated
  with check (
    role = 'owner'
    and id = auth.uid()
    and not exists (select 1 from staff where role = 'owner')
  );
