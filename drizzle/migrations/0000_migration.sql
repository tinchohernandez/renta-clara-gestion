
-- ROLES
create type public.app_role as enum ('admin','owner','tenant');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;
create policy "own roles or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- OWNERS / TENANTS
create table public.owners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  dni_cuit text,
  email text,
  phone text,
  address text,
  bank_account text,
  notes text,
  user_id uuid,
  created_at timestamptz not null default now()
);
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  dni_cuit text,
  email text,
  phone text,
  address text,
  notes text,
  user_id uuid,
  created_at timestamptz not null default now()
);
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete restrict,
  address text not null,
  city text,
  property_type text not null default 'Departamento',
  description text,
  created_at timestamptz not null default now()
);

create type public.adjustment_index as enum ('IPC','IPC_NEUQUEN','ICL','ACUERDO');
create type public.currency_code as enum ('ARS','USD');
create type public.commission_kind as enum ('percent','fixed');

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  currency currency_code not null default 'ARS',
  base_rent numeric(14,2) not null,
  current_rent numeric(14,2) not null,
  adjustment_index adjustment_index not null default 'IPC',
  adjustment_frequency_months int not null default 3,
  next_adjustment_date date,
  commission_type commission_kind not null default 'percent',
  commission_value numeric(14,2) not null default 0,
  due_day int not null default 10,
  status text not null default 'active',
  fees_paid boolean not null default false,
  fees_amount numeric(14,2),
  fees_installments int,
  notes text,
  created_at timestamptz not null default now()
);

create table public.contract_adjustments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  applied_on date not null default current_date,
  index_type adjustment_index not null,
  percentage numeric(8,4) not null,
  previous_rent numeric(14,2) not null,
  new_rent numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table public.index_values (
  id uuid primary key default gen_random_uuid(),
  index_type adjustment_index not null,
  period date not null,
  percentage numeric(8,4) not null,
  applied_count int not null default 0,
  created_at timestamptz not null default now(),
  unique(index_type, period)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  period date not null,
  due_date date not null,
  currency currency_code not null,
  rent_amount numeric(14,2) not null,
  extra_amount numeric(14,2) not null default 0,
  extra_detail text,
  commission_amount numeric(14,2) not null default 0,
  status text not null default 'pending', -- pending | submitted | paid
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(contract_id, period)
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  file_path text not null,
  file_type text,
  uploaded_by uuid,
  ai_amount numeric(14,2),
  ai_date date,
  ai_method text,
  ai_currency text,
  ai_notes text,
  ai_status text not null default 'pending', -- pending | done | error
  status text not null default 'pending', -- pending | approved | rejected
  review_note text,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  file_path text not null,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'open', -- open | in_progress | resolved
  ai_summary text,
  ai_priority text,
  ai_draft_reply text,
  admin_reply text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  movement_date date not null default current_date,
  kind text not null, -- income | expense
  category text not null,
  description text,
  amount numeric(14,2) not null,
  currency currency_code not null default 'ARS',
  source text not null default 'manual', -- manual | fees | commission
  contract_id uuid references public.contracts(id) on delete set null,
  receipt_id uuid references public.receipts(id) on delete set null unique,
  created_at timestamptz not null default now()
);

-- GRANTS
grant select, insert, update, delete on public.owners, public.tenants, public.properties, public.contracts,
  public.contract_adjustments, public.index_values, public.receipts, public.payment_proofs, public.invoices,
  public.claims, public.cash_movements to authenticated;
grant all on public.owners, public.tenants, public.properties, public.contracts,
  public.contract_adjustments, public.index_values, public.receipts, public.payment_proofs, public.invoices,
  public.claims, public.cash_movements to service_role;

alter table public.owners enable row level security;
alter table public.tenants enable row level security;
alter table public.properties enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_adjustments enable row level security;
alter table public.index_values enable row level security;
alter table public.receipts enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.invoices enable row level security;
alter table public.claims enable row level security;
alter table public.cash_movements enable row level security;

-- helper access functions
create or replace function public.is_contract_tenant(_contract uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from contracts c join tenants t on t.id=c.tenant_id where c.id=_contract and t.user_id=auth.uid())
$$;
create or replace function public.is_contract_owner(_contract uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from contracts c join properties p on p.id=c.property_id join owners o on o.id=p.owner_id
    where c.id=_contract and o.user_id=auth.uid())
$$;
create or replace function public.receipt_contract(_receipt uuid) returns uuid
language sql stable security definer set search_path=public as $$ select contract_id from receipts where id=_receipt $$;

-- admin full access everywhere
do $$ declare t text; begin
  foreach t in array array['owners','tenants','properties','contracts','contract_adjustments','index_values','receipts','payment_proofs','invoices','claims','cash_movements'] loop
    execute format('create policy "admin all" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

create policy "self owner" on public.owners for select to authenticated using (user_id = auth.uid());
create policy "self tenant" on public.tenants for select to authenticated using (user_id = auth.uid());
create policy "owner props" on public.properties for select to authenticated
  using (exists(select 1 from owners o where o.id=owner_id and o.user_id=auth.uid())
      or exists(select 1 from contracts c where c.property_id=properties.id and public.is_contract_tenant(c.id)));
create policy "party contracts" on public.contracts for select to authenticated
  using (public.is_contract_tenant(id) or public.is_contract_owner(id));
create policy "party receipts" on public.receipts for select to authenticated
  using (public.is_contract_tenant(contract_id) or public.is_contract_owner(contract_id));
create policy "tenant proofs read" on public.payment_proofs for select to authenticated
  using (public.is_contract_tenant(public.receipt_contract(receipt_id)));
create policy "tenant proofs insert" on public.payment_proofs for insert to authenticated
  with check (uploaded_by = auth.uid() and public.is_contract_tenant(public.receipt_contract(receipt_id)));
create policy "invoice read" on public.invoices for select to authenticated
  using (public.is_contract_owner(public.receipt_contract(receipt_id))
     or (public.is_contract_tenant(public.receipt_contract(receipt_id))
         and exists(select 1 from receipts r where r.id=receipt_id and r.status='paid')));
create policy "owner invoice insert" on public.invoices for insert to authenticated
  with check (uploaded_by = auth.uid() and public.is_contract_owner(public.receipt_contract(receipt_id)));
create policy "tenant claims read" on public.claims for select to authenticated
  using (public.is_contract_tenant(contract_id) or public.is_contract_owner(contract_id));
create policy "tenant claims insert" on public.claims for insert to authenticated
  with check (created_by = auth.uid() and public.is_contract_tenant(contract_id));

-- mark receipt submitted when tenant uploads proof
create or replace function public.on_proof_insert() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update receipts set status='submitted' where id=new.receipt_id and status='pending';
  return new;
end $$;
create trigger trg_proof_insert after insert on public.payment_proofs for each row execute function public.on_proof_insert();

-- signup: assign roles and link records by email
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare linked boolean := false;
begin
  if not exists(select 1 from user_roles where role='admin') then
    insert into user_roles(user_id, role) values (new.id,'admin');
    return new;
  end if;
  update owners set user_id=new.id where lower(email)=lower(new.email) and user_id is null;
  if found then insert into user_roles(user_id,role) values(new.id,'owner') on conflict do nothing; linked := true; end if;
  update tenants set user_id=new.id where lower(email)=lower(new.email) and user_id is null;
  if found then insert into user_roles(user_id,role) values(new.id,'tenant') on conflict do nothing; linked := true; end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- when agency loads/edits an owner/tenant whose email already has an account
create or replace function public.link_party_by_email() returns trigger language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
  if new.user_id is null and new.email is not null then
    select id into uid from auth.users where lower(email)=lower(new.email) limit 1;
    if uid is not null then
      new.user_id := uid;
      insert into user_roles(user_id,role) values(uid, case when tg_table_name='owners' then 'owner'::app_role else 'tenant'::app_role end) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
create trigger trg_owner_link before insert or update of email on public.owners for each row execute function public.link_party_by_email();
create trigger trg_tenant_link before insert or update of email on public.tenants for each row execute function public.link_party_by_email();

-- contract creation: fees to cash
create or replace function public.on_contract_insert() returns trigger language plpgsql security definer set search_path=public as $$
declare n int; i int;
begin
  if new.next_adjustment_date is null then
    new.next_adjustment_date := (new.start_date + make_interval(months => new.adjustment_frequency_months))::date;
  end if;
  return new;
end $$;
create trigger trg_contract_before before insert on public.contracts for each row execute function public.on_contract_insert();

create or replace function public.on_contract_fees() returns trigger language plpgsql security definer set search_path=public as $$
declare n int; i int; per numeric;
begin
  if new.fees_paid and coalesce(new.fees_amount,0) > 0 then
    n := greatest(coalesce(new.fees_installments,1),1);
    per := round(new.fees_amount / n, 2);
    for i in 0..n-1 loop
      insert into cash_movements(movement_date, kind, category, description, amount, currency, source, contract_id)
      values ((current_date + make_interval(months => i))::date, 'income', 'Honorarios por alquiler',
        format('Honorarios cuota %s/%s', i+1, n), per, new.currency, 'fees', new.id);
    end loop;
  end if;
  return new;
end $$;
create trigger trg_contract_fees after insert on public.contracts for each row execute function public.on_contract_fees();

-- commission calc
create or replace function public.calc_commission(_type commission_kind, _value numeric, _rent numeric) returns numeric
language sql immutable as $$ select case when _type='percent' then round(_rent * _value / 100, 2) else _value end $$;

-- generate monthly receipts
create or replace function public.generate_receipts(_period date) returns int language plpgsql security definer set search_path=public as $$
declare p date := date_trunc('month', _period)::date; cnt int;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  insert into receipts(contract_id, period, due_date, currency, rent_amount, commission_amount)
  select c.id, p, (p + (least(c.due_day,28)-1))::date, c.currency, c.current_rent,
         calc_commission(c.commission_type, c.commission_value, c.current_rent)
  from contracts c
  where c.status='active' and c.start_date <= (p + interval '1 month - 1 day')::date and c.end_date >= p
  on conflict (contract_id, period) do nothing;
  get diagnostics cnt = row_count;
  return cnt;
end $$;

-- approve payment -> receipt paid + commission to cash
create or replace function public.review_payment(_proof uuid, _approve boolean, _note text default null) returns void
language plpgsql security definer set search_path=public as $$
declare pr payment_proofs; r receipts; c contracts;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  select * into pr from payment_proofs where id=_proof;
  if not found then raise exception 'not found'; end if;
  select * into r from receipts where id=pr.receipt_id;
  select * into c from contracts where id=r.contract_id;
  if _approve then
    update payment_proofs set status='approved', review_note=_note where id=_proof;
    update receipts set status='paid', paid_at=now() where id=r.id;
    if r.commission_amount > 0 then
      insert into cash_movements(movement_date, kind, category, description, amount, currency, source, contract_id, receipt_id)
      values (current_date, 'income', 'Honorarios de administración',
        format('Administración %s', to_char(r.period,'MM/YYYY')), r.commission_amount, r.currency, 'commission', c.id, r.id)
      on conflict (receipt_id) do nothing;
    end if;
  else
    update payment_proofs set status='rejected', review_note=_note where id=_proof;
    update receipts set status='pending' where id=r.id and status='submitted'
      and not exists(select 1 from payment_proofs where receipt_id=r.id and status='pending');
  end if;
end $$;

-- index load: apply to all contracts due for adjustment in that month
create or replace function public.apply_index(_index adjustment_index, _period date, _pct numeric) returns int
language plpgsql security definer set search_path=public as $$
declare p date := date_trunc('month', _period)::date; pend date := (date_trunc('month', _period) + interval '1 month - 1 day')::date;
  c record; cnt int := 0; nr numeric;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _index='ACUERDO' then raise exception 'Acuerdo de partes se actualiza manualmente por contrato'; end if;
  insert into index_values(index_type, period, percentage) values (_index, p, _pct)
    on conflict (index_type, period) do update set percentage=excluded.percentage;
  for c in select * from contracts where status='active' and adjustment_index=_index
      and next_adjustment_date between p and pend loop
    nr := round(c.current_rent * (1 + _pct/100), 2);
    insert into contract_adjustments(contract_id, index_type, percentage, previous_rent, new_rent)
      values (c.id, _index, _pct, c.current_rent, nr);
    update contracts set current_rent=nr,
      next_adjustment_date=(next_adjustment_date + make_interval(months => adjustment_frequency_months))::date
      where id=c.id;
    cnt := cnt + 1;
  end loop;
  update index_values set applied_count = applied_count + cnt where index_type=_index and period=p;
  return cnt;
end $$;

-- manual adjustment (acuerdo de partes)
create or replace function public.adjust_contract_manual(_contract uuid, _pct numeric) returns numeric
language plpgsql security definer set search_path=public as $$
declare c contracts; nr numeric;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  select * into c from contracts where id=_contract;
  nr := round(c.current_rent * (1 + _pct/100), 2);
  insert into contract_adjustments(contract_id, index_type, percentage, previous_rent, new_rent)
    values (c.id, c.adjustment_index, _pct, c.current_rent, nr);
  update contracts set current_rent=nr,
    next_adjustment_date=(coalesce(next_adjustment_date,current_date) + make_interval(months => adjustment_frequency_months))::date
    where id=c.id;
  return nr;
end $$;

grant execute on function public.generate_receipts(date), public.review_payment(uuid,boolean,text),
  public.apply_index(adjustment_index,date,numeric), public.adjust_contract_manual(uuid,numeric) to authenticated;
