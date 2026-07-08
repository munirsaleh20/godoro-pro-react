-- Run this once in your Supabase project (SQL Editor) BEFORE using the
-- updated app. It adds a column that stores the cost (buy price) of the
-- product at the exact moment of each sale, so profit can later be
-- calculated correctly as (selling price - cost price), not just revenue.
--
-- Existing/old sales rows will get unit_cost = 0 (their true cost is
-- unknown since it wasn't tracked before). New sales going forward will
-- be saved with the correct cost automatically.

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0;
