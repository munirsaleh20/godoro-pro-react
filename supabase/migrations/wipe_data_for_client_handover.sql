-- ⚠️ HATUA HII HAIWEZI KUTENGUZWA - inafuta data ZOTE za biashara
-- (bidhaa, mauzo, madeni, wafanyakazi, matumizi, transfers, wasambazaji,
-- wateja wa jumla, maduka) ili mteja aanze na mfumo mtupu kabisa.
-- Muundo wa jedwali (schema), RLS policies, na Edge Functions HAVIGUSWI -
-- ni data pekee inayofutwa.

truncate table
  wholesale_transactions,
  wholesale_customers,
  supplier_transactions,
  suppliers,
  transfers,
  expenses,
  debts,
  sales,
  products,
  staff,
  locations
restart identity cascade;
