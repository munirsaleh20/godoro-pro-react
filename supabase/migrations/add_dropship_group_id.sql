-- Inaunganisha mzigo wa dropship (supplier_transactions.type = 'stock_in')
-- na miamala ya mteja wa jumla iliyoundwa wakati huo huo
-- (wholesale_transactions goods + payment ya advance, kama ipo).
-- Bila hii, kufuta mzigo wa dropship kwenye "sheet" ya kiwanda hakukuwa
-- kukifuta deni la mteja wa jumla lililoambatana nalo - deni/faida
-- ilibaki milele hata baada ya kufuta.
alter table supplier_transactions
  add column if not exists dropship_group_id uuid null;

alter table wholesale_transactions
  add column if not exists dropship_group_id uuid null;

create index if not exists idx_supplier_transactions_dropship_group
  on supplier_transactions (dropship_group_id);

create index if not exists idx_wholesale_transactions_dropship_group
  on wholesale_transactions (dropship_group_id);
