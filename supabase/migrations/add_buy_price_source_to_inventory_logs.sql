-- Run this once in Supabase SQL Editor.
--
-- KIPENGELE: Kuruhusu "Edit" kamili ya rekodi ya inventory_logs (Daily
-- Summary, Inventory) - ikiwemo Bei ya Ununuzi (buy_price) na Chanzo
-- (source - mfano "Kiwanda: Jina la Supplier" au "Manual (Inventory)").
-- Awali jedwali hili lilikuwa na unit_price (bei ya kuuza) tu, hakuna
-- mahali pa kutunza bei ya ununuzi wala chanzo cha mzigo.

alter table public.inventory_logs
  add column if not exists buy_price numeric,
  add column if not exists source text;
