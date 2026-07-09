-- Run this once in Supabase SQL Editor.
--
-- TATIZO: Ukifuta "sale" (mauzo), stock ya bidhaa husika haikuwa ikirudi
-- (haikuwa inaongezeka tena) kwa sababu jedwali la `sales` halikuwa
-- linahifadhi ni bidhaa (product) ipi hasa iliyouzwa - lilikuwa linahifadhi
-- tu maneno ("items": "Jina x2"), si kiungo (id) cha bidhaa yenyewe.
--
-- Hii inaongeza safu (column) mpya `product_id` kwenye `sales` ili kila
-- mauzo mapya yajue ni bidhaa ipi ilitoka kwenye stock - hivyo ukifuta
-- mauzo hayo, stock inaweza kurudishwa kiotomatiki.
--
-- KUMBUKA: Mauzo ya ZAMANI (yaliyofanyika kabla ya kubandika hii) hayatakuwa
-- na `product_id` (yatakuwa null), kwa hiyo yakifutwa stock haitorudi
-- kiotomatiki kwa hayo ya zamani pekee (kwa sababu hatujui yalitoka bidhaa
-- ipi hasa). Mauzo mapya yote kuanzia sasa yatafanya kazi vizuri kabisa.

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;
