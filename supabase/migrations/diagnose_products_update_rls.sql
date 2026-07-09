-- HATUA 1: KWANZA kimbiza hii TU kuangalia Policies zilizopo sasa kwenye
-- jedwali la `products` (usibadilishe chochote bado - hii ni ku-soma tu):

select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr,
       pg_get_expr(polwithcheck, polrelid) as with_check_expr
from pg_policy
where polrelid = 'products'::regclass;

-- Nitumie matokeo ya query hii (nakili/screenshot) ili nikuandikie fix
-- sahihi kabisa kulingana na Policy zilizopo tayari - badala ya kubahatisha
-- na kuvunja kitu kingine kinachofanya kazi vizuri sasa (mfano: stock
-- kupungua salesperson akiuza bado kinafanya kazi vizuri, hivyo sitaki
-- kuathiri hilo).

-- ==========================================================================
-- HATUA 2 (USIKIMBIE BADO): Hii ndiyo mfano wa "fix" itakayohitajika kama
-- ikithibitika products UPDATE haina Policy ya kutosha kwa Owner/Manager
-- kubadilisha stock ya locations zote (store na shops zote), wakati
-- Salesperson anaendelea kuruhusiwa ku-update stock ya duka lake pekee
-- (kama ilivyo sasa akiuza bidhaa). USIIKIMBIE mpaka tuwe tumethibitisha
-- kwa Hatua 1 kuwa hii ndiyo tatizo hasa:
--
-- alter table products enable row level security;
--
-- drop policy if exists "products_update_owner_manager_all" on products;
-- create policy "products_update_owner_manager_all"
--   on products for update
--   to authenticated
--   using (my_role() in ('owner', 'manager'))
--   with check (my_role() in ('owner', 'manager'));
