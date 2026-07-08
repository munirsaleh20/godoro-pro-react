# Godoro Pro (React)

Kuhamisha Godoro Pro kutoka HTML moja kubwa kwenda React,
kwa mtindo sawa na PhoneShop Pro (Vite + React + Supabase + Vercel).

## Kilichopo kwenye hatua hii

- ✅ Auth kamili: Login, Owner Signup (owner_exists check), session persistence
- ✅ Role-based access: Owner / Manager / Salesperson
- ✅ Dashboard (Manager view + Salesperson placeholder)
- ✅ Stores & Shops: **Add / Edit / Delete kamili** (hizi hazikuwa zinafanya kazi
  kwenye faili la HTML — function za `renderStores`, `renderShops`, na `addStore`
  zilikuwa zinaitwa kwenye code lakini hazikuwa zimeandikwa popote)
- ✅ Products/Inventory: Add / Edit / Delete, filter (Store/Shop), search,
  Buy Price kwa Owner pekee
- ✅ Sales: All Sales (Manager) / My Sales (Salesperson), New Sale na
  auto-match ya stock, stock inapungua kiotomatiki, Edit/Delete (Manager)
- ✅ Debts: zinaundwa kiotomatiki nyuma ya pazia kila sale ya "Debt" (hii
  haikuwa ikifanyika kabisa kwenye HTML — jedwali la debts lilikuwa
  linasomwa tu, kamwe halikuwa likiandikwa)
- ✅ Staff: Add / Edit (role/location) / Remove — **kwa njia salama** kupitia
  Supabase Edge Function (hii pia haikuwa ikifanya kazi kwenye HTML —
  function za `renderStaff`, `addStaff`, `toggleStaffLocationField`
  hazikuwa zimeandikwa popote, na zaidi ya hilo, HTML ilikuwa na
  Service Role Key wazi kwenye browser - hatari kubwa ya usalama)
- ✅ Toast notifications na Confirm dialog ya custom (badala ya `window.confirm`,
  ambayo huzuiwa na baadhi ya in-app browsers kama WhatsApp/Instagram)
- ✅ Debts (ukurasa kamili): Mark Paid, Delete — kwa Manager na Salesperson (duka lake)
- ✅ Expenses: Add/Edit/Delete, kwa Manager (maeneo yote) na Salesperson (duka lake)
- ✅ Transfers: kuhamisha stock kutoka Store kwenda Shop, historia kamili
  (hii pia haikuwa ikifanya kazi kabisa kwenye HTML — `executeTransfer` na
  `loadTransferProducts` hazikuwa zimeandikwa popote)
- ✅ Profit & Reports (Owner pekee): Revenue/Expenses/Profit kwa kipindi
  (Today/Month/Year/All), breakdown kwa location, na breakdown ya kila siku

## Hali ya sasa

Moduli zote muhimu za biashara zimekamilika: Dashboard, Stores, Shops,
Inventory, Sales, Debts, Staff, Expenses, Transfers, Profit & Reports.

## Jinsi ya kuendesha kwenye kompyuta yako

```bash
npm install
cp .env.example .env
# fungua .env na weka VITE_SUPABASE_ANON_KEY yako halisi
npm run dev
```

## ⚠️ Hatua ya ZIADA inayohitajika kwa Staff module: Deploy Edge Function

Staff creation/deletion inahitaji Supabase Edge Function (`create-staff`)
ili Service Role Key ibaki salama upande wa server. Bila hatua hii, "+ Add
Staff" na "Remove" havitafanya kazi (utaona error "Failed to send a request
to the Edge Function").

```bash
npm install -g supabase
supabase login
supabase link --project-ref tghrcerahzztaitmmbfz
supabase functions deploy create-staff
```

Service Role Key inapatikana kiotomatiki kwenye Edge Functions environment
ya Supabase - hauitaji kuiweka mwenyewe popote.

## Jinsi ya ku-deploy (sawa na PhoneShop Pro)

1. Push code hii kwenye GitHub repo mpya (au ile ile ukibadilisha branch)
2. Unganisha repo na Vercel
3. Kwenye Vercel → Settings → Environment Variables, ongeza:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy
5. Usisahau kudeploy Edge Function (`create-staff`) kwenye Supabase - hatua
   tofauti na Vercel, angalia sehemu ya juu

## ⚠️ Muhimu kuhusu usalama (kutoka kwenye faili la HTML la awali)

Faili la awali la Godoro Pro lilikuwa na **Supabase Service Role Key ikiwa
imeandikwa moja kwa moja kwenye JavaScript ya browser** (`SUPABASE_SERVICE_KEY`).
Hii ni hatari kubwa ya usalama — mtu yeyote anayefungua "View Source" anaweza
kuiona na kuipata full admin access kwenye database yako yote (kupita RLS zote).

Kwenye React version hii, sijaweka service key kabisa kwenye client. Staff
creation/deletion sasa inapitia Supabase Edge Function ambapo service key
inabaki upande wa server pekee.

## Muundo wa Folder

```
src/
  context/       AuthContext, DataContext, ToastContext, ConfirmContext
  pages/         LoginPage, Dashboard, Locations, Inventory, Sales, Staff
  components/    Sidebar, Modal, ProductFormModal, AddSaleModal,
                 EditSaleModal, StaffFormModal
  utils/         format.js, productConstants.js
supabase/
  functions/
    create-staff/  Edge Function ya kuunda/kufuta staff kwa usalama
```

## ⚠️ Hatua ya ZIADA: Unda jedwali la `transfers` kwenye Supabase

Feature ya Transfers ni mpya kabisa (haikuwa ikifanya kazi hata kidogo kwenye
HTML ya awali — `loadTransferProducts`/`executeTransfer` hazikuwa zimeandikwa
popote). Kwa hiyo jedwali la `transfers` pengine halipo kwenye database yako.

Nenda Supabase Dashboard → SQL Editor → bandika hii kisha "Run":

```sql
create table if not exists transfers (
  id uuid primary key default gen_random_uuid(),
  from_location_id uuid references locations(id),
  to_location_id uuid references locations(id),
  note text,
  items jsonb,
  created_at timestamptz default now()
);

alter table transfers enable row level security;

create policy "Authenticated users can view transfers"
  on transfers for select
  to authenticated
  using (true);

create policy "Authenticated users can insert transfers"
  on transfers for insert
  to authenticated
  with check (true);
```

Kama tayari una RLS policies maalum kwenye majedwali mengine (kwa mfano
kuzuia salesperson kuona data za maeneo mengine), rekebisha hizi policies
zifuate muundo uleule.
