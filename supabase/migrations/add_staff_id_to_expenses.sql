-- Run this once in Supabase SQL Editor.
--
-- Inaongeza safu ya staff_id kwenye expenses, ili kila expense ijue ni
-- nani (owner/manager) aliyeiongeza - hii inatumika kuonyesha "Recorded by"
-- kwenye ukurasa wa Expenses, ili iwe rahisi kutofautisha nani aliweka
-- rent/expense fulani hata kama staff kadhaa wanashiriki duka moja.
--
-- (Kwa Debts, hatuhitaji safu mpya - kila deni linatokana na sale, na
-- sales tayari ina staff_id, hivyo "Recorded by" ya deni inatolewa kupitia
-- sale husika.)

alter table public.expenses
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

comment on column public.expenses.staff_id is
  'Staff aliyerekodi expense hii (owner/manager). Null kwa expenses za zamani zilizorekodiwa kabla ya safu hii.';
