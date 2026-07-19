-- Run this once in Supabase SQL Editor.
--
-- KIPENGELE: Kufuta (Delete) rekodi moja moja ya "inventory_logs" kutoka
-- kwenye "Daily Summary" (Inventory) - awali jedwali hili lilikuwa
-- "log-only" (hakuna update/delete) kwa makusudi, lakini sasa
-- tunahitaji kuruhusu Owner/Manager kusahihisha makosa (mfano bidhaa
-- iliongezwa kimakosa au idadi si sahihi) kwa kufuta rekodi husika.
--
-- Sawa na jedwali mengine - GRANT ya msingi inahitajika KABLA ya Policy.

grant delete on table public.inventory_logs to authenticated;

drop policy if exists inventory_logs_delete on public.inventory_logs;
create policy inventory_logs_delete on public.inventory_logs for delete to authenticated
  using (my_role() in ('owner', 'manager'));
