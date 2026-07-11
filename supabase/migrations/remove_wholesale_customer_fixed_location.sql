-- Run this once in Supabase SQL Editor.
--
-- BADILIKO: Mteja wa Wholesale HAJAFUNGWA tena na duka/store MOJA
-- maalum ("duka linalohudumia"). Sasa anaweza kuhudumiwa kutoka Store
-- YOYOTE - kila anapopewa mzigo (goods), Owner/Manager anachagua Store
-- husika WAKATI HUO (hii tayari ilikuwepo kwenye wholesale_transactions.
-- location_id) - hivyo column ya location_id kwenye wholesale_customers
-- haihitajiki tena.

alter table public.wholesale_customers drop column if exists location_id;

-- Malipo (type='payment') hayana Store maalum (fedha si kitu
-- kinachotoka duka fulani), kwa hiyo location_id kwenye
-- wholesale_transactions inatakiwa iwe HIARI (nullable) - inabaki
-- LAZIMA (itajazwa na App) kwa aina ya 'goods' pekee, ambapo Owner/
-- Manager anachagua Store wakati wa kutoa mzigo.
alter table public.wholesale_transactions alter column location_id drop not null;
