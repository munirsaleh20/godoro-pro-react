-- Run this once in Supabase SQL Editor.
--
-- PART 1 (cleanup): if any duplicate debt rows already exist for the same
-- sale (e.g. from the bug you saw), this keeps only the OLDEST unpaid debt
-- row per sale_id and deletes the extra duplicate(s). Safe to run even if
-- you have no duplicates - it simply won't delete anything in that case.
delete from debts a
using debts b
where a.sale_id = b.sale_id
  and a.is_paid = false
  and b.is_paid = false
  and a.id > b.id;

-- PART 2 (prevention): stops the database itself from ever allowing two
-- unpaid debt rows for the same sale again, even if the app tries to
-- insert twice (e.g. a double click or a network retry).
create unique index if not exists debts_unique_unpaid_sale
  on debts (sale_id)
  where is_paid = false;
