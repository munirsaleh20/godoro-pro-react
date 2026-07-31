-- Run this once in Supabase SQL Editor, BAADA ya
-- add_buy_price_source_to_inventory_logs.sql kuwa imeshaendeshwa.
--
-- KIPENGELE: "Backfill" ya buy_price kwa rekodi za ZAMANI za inventory_logs
-- (zilizoandikwa kabla ya kuongezwa kwa safu ya buy_price) - zinaonyesha 0
-- kwa sasa. Hii inachukua Bei ya Ununuzi ya SASA ya bidhaa husika (kutoka
-- jedwali la products, kwa product_id) kama MAKADIRIO - kama bei
-- imebadilika tangu mzigo huo uliandikwa, hii si sahihi 100% (ni
-- makadirio bora tuliyonayo), lakini ni bora kuliko 0. Rekodi zenye
-- buy_price tayari (zisizo null/0) HAZIGUSWI.

update public.inventory_logs il
set buy_price = p.buy_price
from public.products p
where il.product_id = p.id
  and (il.buy_price is null or il.buy_price = 0)
  and p.buy_price is not null and p.buy_price > 0;
