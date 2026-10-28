-- 0004: vincular cuentas solo con email confirmado, alta de administradores por email,
--       endurecer lo que pueden insertar inquilinos/propietarios, y cerrar funciones al rol anónimo.

-- ============================================================
-- 1) ADMINISTRADORES POR EMAIL (reemplaza "el primer usuario es admin")
-- ============================================================
create table public.admin_emails (
  email text primary key check (email = lower(email)),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security;
-- Sin políticas ni permisos para clientes: solo se usa mediante las funciones de abajo.
revoke all on public.admin_emails from anon, authenticated;
grant all on public.admin_emails to service_role;

-- ============================================================
-- 2) VINCULAR CUENTA <-> PROPIETARIO/INQUILINO/ADMIN (solo email confirmado)
-- ============================================================
create or replace function public.link_user_to_parties(_uid uuid, _email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if _email is null then return; end if;
  update owners set user_id = _uid where lower(email) = lower(_email) and user_id is null;
  if found then insert into user_roles(user_id, role) values (_uid, 'owner') on conflict do nothing; end if;
  update tenants set user_id = _uid where lower(email) = lower(_email) and user_id is null;
  if found then insert into user_roles(user_id, role) values (_uid, 'tenant') on conflict do nothing; end if;
  if exists (select 1 from admin_emails where email = lower(_email)) then
    insert into user_roles(user_id, role) values (_uid, 'admin') on conflict do nothing;
  end if;
end $$;

-- Alta de cuenta: solo vincula si el email ya viene confirmado.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null then
    perform public.link_user_to_parties(new.id, new.email);
  end if;
  return new;
end $$;

-- Cuando la persona confirma su email, recién ahí se vincula.
create or replace function public.handle_user_confirmed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.link_user_to_parties(new.id, new.email);
  end if;
  return new;
end $$;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

-- Cuando la inmobiliaria carga/edita un propietario o inquilino cuyo email ya tiene cuenta confirmada.
create or replace function public.link_party_by_email() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if new.user_id is null and new.email is not null then
    select id into uid from auth.users
      where lower(email) = lower(new.email) and email_confirmed_at is not null limit 1;
    if uid is not null then
      new.user_id := uid;
      insert into user_roles(user_id, role)
        values (uid, case when tg_table_name = 'owners' then 'owner'::app_role else 'tenant'::app_role end)
        on conflict do nothing;
    end if;
  end if;
  return new;
end $$;

-- ============================================================
-- 3) FUNCIONES PARA LA PANTALLA "EQUIPO" (solo administradores)
-- ============================================================
create or replace function public.add_admin(_email text) returns void
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(_email)); uid uuid;
begin
  if not has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  if e is null or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email inválido'; end if;
  insert into admin_emails(email, added_by) values (e, auth.uid()) on conflict do nothing;
  select id into uid from auth.users where lower(email) = e and email_confirmed_at is not null limit 1;
  if uid is not null then
    insert into user_roles(user_id, role) values (uid, 'admin') on conflict do nothing;
  end if;
end $$;

create or replace function public.remove_admin(_email text) returns void
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(_email)); uid uuid; me text;
begin
  if not has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  select lower(email) into me from auth.users where id = auth.uid();
  if e = me then raise exception 'No podés quitarte a vos mismo como administrador'; end if;
  delete from admin_emails where email = e;
  select id into uid from auth.users where lower(email) = e limit 1;
  if uid is not null then delete from user_roles where user_id = uid and role = 'admin'; end if;
end $$;

create or replace function public.list_admins() returns table(admin_email text, is_active boolean, added_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  return query
    select ae.email,
           exists (select 1 from auth.users u join user_roles ur on ur.user_id = u.id and ur.role = 'admin'
                   where lower(u.email) = ae.email),
           ae.created_at
    from admin_emails ae
    order by ae.created_at;
end $$;

-- ============================================================
-- 4) ENDURECER INSERTS DE INQUILINOS Y PROPIETARIOS
-- ============================================================
drop policy "tenant proofs insert" on public.payment_proofs;
create policy "tenant proofs insert" on public.payment_proofs for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_contract_tenant(public.receipt_contract(receipt_id))
    and split_part(file_path, '/', 1) = auth.uid()::text
    and status = 'pending' and ai_status = 'pending' and review_note is null
    and ai_amount is null and ai_date is null and ai_method is null and ai_currency is null and ai_notes is null
  );

drop policy "tenant claims insert" on public.claims;
create policy "tenant claims insert" on public.claims for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_contract_tenant(contract_id)
    and status = 'open' and admin_reply is null
    and ai_summary is null and ai_priority is null and ai_draft_reply is null
  );

drop policy "owner invoice insert" on public.invoices;
create policy "owner invoice insert" on public.invoices for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_contract_owner(public.receipt_contract(receipt_id))
    and split_part(file_path, '/', 1) = auth.uid()::text
  );

-- ============================================================
-- 5) PERMISOS DE FUNCIONES: nada abierto al rol anónimo
-- ============================================================
revoke all on function
  public.has_role(uuid, app_role),
  public.is_contract_tenant(uuid),
  public.is_contract_owner(uuid),
  public.receipt_contract(uuid),
  public.can_read_document(text),
  public.generate_receipts(date),
  public.review_payment(uuid, boolean, text),
  public.apply_index(adjustment_index, date, numeric),
  public.adjust_contract_manual(uuid, numeric),
  public.add_admin(text),
  public.remove_admin(text),
  public.list_admins()
from public, anon, authenticated;

grant execute on function
  public.has_role(uuid, app_role),
  public.is_contract_tenant(uuid),
  public.is_contract_owner(uuid),
  public.receipt_contract(uuid),
  public.can_read_document(text),
  public.generate_receipts(date),
  public.review_payment(uuid, boolean, text),
  public.apply_index(adjustment_index, date, numeric),
  public.adjust_contract_manual(uuid, numeric),
  public.add_admin(text),
  public.remove_admin(text),
  public.list_admins()
to authenticated;

-- Funciones internas y de triggers: no se llaman desde la app.
revoke all on function
  public.link_user_to_parties(uuid, text),
  public.handle_new_user(),
  public.handle_user_confirmed(),
  public.link_party_by_email(),
  public.on_proof_insert(),
  public.on_contract_insert(),
  public.on_contract_fees()
from public, anon, authenticated;
