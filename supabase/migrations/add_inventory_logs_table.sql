-- Run this once in Supabase SQL Editor.
--
-- KIPENGELE KIPYA: "Inventory Logs" - kila mara bidhaa inapoongezwa kwenye
-- stock (iwe bidhaa MPYA kabisa, au ONGEZEKO la stock ya bidhaa iliyokuwepo
-- tayari - "restock"), tunahifadhi kumbukumbu moja hapa: tarehe, duka, jina
-- la bidhaa, idadi (qty) iliyoongezwa, bei ya kuuza wakati huo, na thamani
-- jumla (qty x bei).
--
-- LENGO: kuwezesha "Muhtasari wa Bidhaa Zilizoongezwa kwa Siku" (Daily
-- Inventory Summary) - jedwali la `products` peke yake haitoshi kwa hili
-- kwa sababu likiongeza stock ya bidhaa iliyokuwepo (badala ya kuunda mstari
-- mpya), `created_at` ya bidhaa hiyo haibadiliki - hivyo ongezeko la siku
-- husika lingepotea. Jedwali hili dogo linahifadhi kila TUKIO la kuongeza
-- stock, si hali ya sasa ya bidhaa.

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text,
  brand text,
  qty integer not null default 0,
  unit_price numeric not null default 0,
  total_value numeric not null default 0, -- qty x unit_price wakati huo
  is_new_product boolean not null default false, -- true = bidhaa mpya, false = restock ya iliyokuwepo
  added_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.inventory_logs is
  'Kumbukumbu ya kila tukio la kuongeza stock (bidhaa mpya au restock) - inatumika kujenga Muhtasari wa Kila Siku (Daily Inventory Summary).';

create index if not exists idx_inventory_logs_location on public.inventory_logs(location_id);
create index if not exists idx_inventory_logs_created_at on public.inventory_logs(created_at);

-- ---------------------------------------------------------------------
-- RLS: sawa na products - Owner/Manager pekee ndio wanaoongeza stock, kwa
-- hiyo insert ni owner/manager pekee. SELECT tunairuhusu kwa watumiaji
-- wote walioingia (kama products_select), Inventory page inachuja kwa
-- location upande wa App kwa Salesperson.
-- ---------------------------------------------------------------------
alter table public.inventory_logs enable row level security;

drop policy if exists inventory_logs_select on public.inventory_logs;
create policy inventory_logs_select on public.inventory_logs for select to authenticated
  using (true);

drop policy if exists inventory_logs_insert on public.inventory_logs;
create policy inventory_logs_insert on public.inventory_logs for insert to authenticated
  with check (my_role() in ('owner', 'manager'));

-- Hakuna update/delete policy - kumbukumbu hizi ni "log" tu, hazipaswi
-- kubadilishwa baada ya kuandikwa.

-- KUMBUKA: hii inahitaji function my_role() ambayo tayari imeundwa na
-- migration ya awali (fix_manager_visibility_and_role_rls.sql /
-- restrict_sales_delete_update_rls.sql).
