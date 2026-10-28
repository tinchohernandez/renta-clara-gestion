alter function public.calc_commission(commission_kind, numeric, numeric) set search_path = public;
create policy "no direct access" on public.admin_emails for all to authenticated using (false) with check (false);
