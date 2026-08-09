-- Run this once in Supabase SQL Editor.
--
-- TATIZO: "Bidhaa iliyouzwa bado inaonekana ipo kwenye stock ya duka
-- husika" - hasa ikitokea Bulk Sale ikiwa na bidhaa ILE ILE mara zaidi
-- ya moja (mfano "Furaha (5x6x6) x1" mara mbili kwenye cart moja), au
-- mauzo mawili ya bidhaa ile ile kwa haraka mfululizo.
--
-- CHANZO HALISI: addSale ilikuwa ikikokotoa stock mpya kwa JS kwa kutumia
-- `matchedProduct.stock` ILIYOKUWA KATIKA KUMBUKUMBU (state) ya screen
-- WAKATI screen ilipopakiwa/badilika mara ya MWISHO - SI thamani halisi
-- ya sasa kwenye database. Bulk Sale inapiga addSale mara kwa mara
-- ndani ya LOOP MOJA (bila screen kupata muda wa kupakua upya state) -
-- hivyo kila hesabu ya "stock - qty" ilikuwa ikitumia stock ya MWANZO
-- (kabla ya bidhaa yoyote kuuzwa kwenye cart hiyo), na hesabu ya MWISHO
-- (bidhaa ile ile) ilikuwa ikiandika juu ya (overwrite) matokeo ya
-- kabla yake - badala ya kutoa (subtract) juu yake. Mfano: Stock=3,
-- ukiuza "x1" mara mbili kwenye Bulk moja: hesabu ya kwanza inaandika
-- DB=2 (3-1), hesabu ya pili inaandika DB=2 TENA (3-1, si 2-1=1) -
-- hivyo DB inabaki 2 badala ya 1 halisi - bidhaa "moja" inayeyuka
-- (haipungui) licha ya kuuzwa kikamilifu.
--
-- Pia: kosa la update likitokea (mfano RLS), addSale ilikuwa ikiandika
-- error console TU (console.error) bila kumjulisha mtumiaji wala
-- kuzuia - stock ya screen (local) ilibadilika (ionekana imepungua),
-- lakini database HAIKUBADILIKA - baada ya refresh/logout-login, bidhaa
-- "inarudi" kwenye stock kana kwamba haikuuzwa.
--
-- FIX: RPC function hii inafanya UPDATE ya "stock = stock - qty"
-- MOJA KWA MOJA kwenye DATABASE (atomic) - kila wito unatumia thamani
-- HALISI ya sasa ya database (si kumbukumbu ya screen), hivyo mauzo
-- mengi ya bidhaa ile ile mfululizo yanapunguza kwa usahihi kila mara,
-- bila kujali screen imepakua upya state au bado. Kazi hii inatumika
-- KWA WOTE WAWILI: kuuza (delta hasi, mfano -1) na kufuta mauzo/
-- kurejesha stock (delta chanya, mfano +1).
--
-- SECURITY: Function hii HAINA "security definer" - inatumia ruhusa za
-- mtumiaji anayeita (invoker), kwa hiyo RLS Policy zilizopo tayari
-- kwenye jedwali la `products` (mfano restriction ya location kwa
-- Salesperson) zinaendelea kutumika sawasawa kama hapo awali - hii
-- HAIONGEZI wala HAIONDOI ruhusa yoyote, inarekebisha TU jinsi
-- namba inakokotolewa.

create or replace function adjust_product_stock(p_product_id uuid, p_delta integer)
returns setof products
language sql
as $$
  update products
  set stock = greatest(0, stock + p_delta), updated_at = now()
  where id = p_product_id
  returning *;
$$;

grant execute on function adjust_product_stock(uuid, integer) to authenticated;
