create or replace function public.can_read_document(_name text) returns boolean
language sql stable security definer set search_path=public as $$
  select public.has_role(auth.uid(),'admin')
    or split_part(_name,'/',1) = auth.uid()::text
    or exists(select 1 from invoices i where i.file_path=_name
        and (public.is_contract_owner(public.receipt_contract(i.receipt_id))
          or (public.is_contract_tenant(public.receipt_contract(i.receipt_id))
              and exists(select 1 from receipts r where r.id=i.receipt_id and r.status='paid'))))
$$;
create policy "docs read" on storage.objects for select to authenticated
  using (bucket_id='documents' and public.can_read_document(name));
create policy "docs upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id='documents' and (split_part(name,'/',1)=auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "docs admin delete" on storage.objects for delete to authenticated
  using (bucket_id='documents' and public.has_role(auth.uid(),'admin'));