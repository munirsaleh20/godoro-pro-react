// Utility ya "search" isiyo kali (lenient search).
//
// TATIZO LILILOKUWEPO: search ya awali ilikuwa ikitumia `.includes()` moja
// kwa moja - hii inahitaji herufi na SPACE ziwe sahihi kabisa kama
// zilivyo-save kwenye database. Mfano: ukiwa umesave "Vitafoam  Deluxe"
// (space mbili), kutafuta "Vitafoam Deluxe" (space moja) au "vitafoam"
// pekee kusingelipata matokeo sahihi kila wakati, hasa kwa wauzaji
// wasio na uzoefu wa kuandika sahihi kabisa.
//
// FIX: tunasafisha (normalize) maneno kabla ya kulinganisha - tunapunguza
// spaces nyingi ziwe moja, tunaondoa nafasi mwanzo/mwisho, herufi ndogo
// zote - kisha tunagawanya search katika MANENO (words) na kuhakiki kila
// neno lipo mahali fulani kwenye "target" (bila kujali mpangilio wa
// maneno). Hii inaruhusu search kama "godoro 5x6" au "5x6 godoro" au
// "  godoro   5x6  " zote kupata matokeo yaleyale.

export function normalizeSearch(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\s+/g, ' ')
    .trim();
}

// target: string moja AU array ya strings/values (mfano: [name, brand, cat])
// query: kile alichoandika mtumiaji kwenye search box
export function matchesSearch(target, query) {
  const q = normalizeSearch(query);
  if (!q) return true; // search tupu -> kila kitu kinaonekana

  const combined = (Array.isArray(target) ? target.join(' ') : target);
  const t = normalizeSearch(combined);

  const words = q.split(' ').filter(Boolean);
  // kila neno la search lazima lipatikane mahali fulani (AND), lakini
  // bila kujali mpangilio wala idadi ya spaces kati yao
  return words.every(w => t.includes(w));
}
