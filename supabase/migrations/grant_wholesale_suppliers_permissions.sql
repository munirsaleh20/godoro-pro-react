-- Run this once in Supabase SQL Editor.
--
-- FIX: "permission denied for table wholesale_customers" na "permission
-- denied for table suppliers" (na majedwali yao ya miamala).
--
-- SABABU: Kama ilivyokuwa kwenye 'transfers' hapo awali - Policies (RLS)
-- za majedwali haya tayari ni SAHIHI, lakini majedwali haya MAPYA
-- hayakupata GRANT ya msingi (table-level) kwa role ya "authenticated"
-- wakati yaliundwa (yaliundwa kwa SQL moja kwa moja, si kupitia Table
-- Editor ya Supabase inayoongeza GRANT hizi kiotomatiki). Postgres
-- inakataa ombi KABLA hata Policy yoyote haijaangaliwa.

grant select, insert, update, delete on table wholesale_customers to authenticated;
grant select, insert, update, delete on table wholesale_transactions to authenticated;
grant select, insert, update, delete on table suppliers to authenticated;
grant select, insert, update, delete on table supplier_transactions to authenticated;
