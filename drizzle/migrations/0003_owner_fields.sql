alter table public.owners add column dni text, add column cuit text, add column cbu text;
alter table public.tenants add column dni text, add column cuit text;
comment on column public.owners.dni_cuit is 'DEPRECATED: replaced by dni and cuit';
comment on column public.owners.bank_account is 'DEPRECATED: replaced by cbu';
comment on column public.tenants.dni_cuit is 'DEPRECATED: replaced by dni and cuit';