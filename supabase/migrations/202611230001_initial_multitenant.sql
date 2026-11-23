-- Navalha: initial multi-establishment schema.
-- Authentication is delegated to Supabase Auth; passwords are never stored here.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.shop_role as enum ('owner', 'barber');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type public.payment_method as enum ('pix', 'card', 'cash', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  logo_url text,
  address text not null default '',
  city text not null default '',
  state text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  pix_key text not null default '',
  is_public boolean not null default true,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.shop_role not null default 'barber',
  display_name text not null,
  specialty text not null default '',
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (shop_id, user_id),
  unique (shop_id, id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  email text not null default '',
  created_at timestamptz not null default now(),
  unique (shop_id, id)
);

create unique index clients_shop_phone_unique on public.clients (shop_id, regexp_replace(phone, '\D', '', 'g'));
create index clients_user_id_idx on public.clients (user_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes between 5 and 600),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (shop_id, id)
);

create table public.business_hours (
  shop_id uuid not null references public.shops(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_open boolean not null default true,
  primary key (shop_id, weekday),
  check ((is_open and opens_at is not null and closes_at is not null and opens_at < closes_at) or (not is_open))
);

create table public.closed_dates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  closed_on date not null,
  reason text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  unique (shop_id, closed_on)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  client_id uuid not null,
  barber_id uuid not null,
  service_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  payment_method public.payment_method not null default 'pix',
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  price_cents integer not null check (price_cents >= 0),
  service_name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  foreign key (shop_id, client_id) references public.clients(shop_id, id) on delete restrict,
  foreign key (shop_id, barber_id) references public.shop_members(shop_id, id) on delete restrict,
  foreign key (shop_id, service_id) references public.services(shop_id, id) on delete restrict,
  check (ends_at > starts_at)
);

create or replace function public.add_shop_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_name text;
begin
  select p.full_name into owner_name from public.profiles p where p.id = new.owner_id;
  insert into public.shop_members (shop_id, user_id, role, display_name, active)
  values (new.id, new.owner_id, 'owner', coalesce(nullif(owner_name, ''), new.name), true);
  return new;
end;
$$;

create trigger add_shop_owner_membership_after_insert
after insert on public.shops
for each row execute function public.add_shop_owner_membership();

create index appointments_shop_starts_idx on public.appointments (shop_id, starts_at);
create index appointments_barber_starts_idx on public.appointments (barber_id, starts_at);
create index appointments_client_idx on public.appointments (client_id, starts_at desc);
alter table public.appointments
  add constraint appointments_prevent_barber_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'));

create or replace function public.cancel_appointment(target_appointment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  update public.appointments a
  set status = 'cancelled', cancelled_at = now()
  where a.id = target_appointment_id
    and a.status in ('pending', 'confirmed')
    and (
      public.is_shop_owner(a.shop_id)
      or public.is_shop_barber(a.shop_id, a.barber_id)
      or exists (
        select 1 from public.clients c
        where c.id = a.client_id and c.user_id = (select auth.uid())
      )
    );
  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;
revoke all on function public.cancel_appointment(uuid) from public;
grant execute on function public.cancel_appointment(uuid) to authenticated;

create or replace function public.is_shop_member(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members m
    where m.shop_id = target_shop_id and m.user_id = (select auth.uid()) and m.active
  );
$$;

create or replace function public.is_shop_public(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.shops s where s.id = target_shop_id and s.is_public);
$$;

create or replace function public.is_shop_owner(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shops s
    where s.id = target_shop_id and s.owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_shop_barber(target_shop_id uuid, target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members m
    where m.id = target_member_id and m.shop_id = target_shop_id
      and m.user_id = (select auth.uid()) and m.active
  );
$$;

create or replace function public.protect_barber_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.user_id = (select auth.uid()) and not public.is_shop_owner(old.shop_id) then
    if new.id <> old.id or new.user_id <> old.user_id or new.shop_id <> old.shop_id
      or new.role <> 'barber' or new.active <> old.active or new.created_at <> old.created_at then
      raise exception 'Barbers can only edit their own public profile fields';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_barber_membership_update
before update on public.shop_members
for each row execute function public.protect_barber_membership();

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.closed_dates enable row level security;
alter table public.appointments enable row level security;

create policy "profiles readable by self or shop teammates" on public.profiles
for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1 from public.shop_members mine
    join public.shop_members theirs on theirs.shop_id = mine.shop_id
    where mine.user_id = (select auth.uid()) and mine.active and theirs.user_id = profiles.id and theirs.active
  )
);
create policy "profile owner manages own profile" on public.profiles
for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "public can view published shops" on public.shops
for select to anon, authenticated using (is_public or owner_id = (select auth.uid()) or public.is_shop_member(id));
create policy "owner creates shop" on public.shops
for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owner updates shop" on public.shops
for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owner deletes shop" on public.shops
for delete to authenticated using (owner_id = (select auth.uid()));

create policy "public sees active barber cards; team sees all" on public.shop_members
for select to anon, authenticated using ((active and public.is_shop_public(shop_id)) or public.is_shop_member(shop_id) or public.is_shop_owner(shop_id));
create policy "owner adds team members" on public.shop_members
for insert to authenticated with check (public.is_shop_owner(shop_id) and role = 'barber');
create policy "owner manages team; barber edits own card" on public.shop_members
for update to authenticated using (public.is_shop_owner(shop_id) or user_id = (select auth.uid()))
with check (
  (public.is_shop_owner(shop_id) and (role = 'barber' or (role = 'owner' and user_id = (select auth.uid()))))
  or (user_id = (select auth.uid()) and role = 'barber')
);
create policy "owner removes team members" on public.shop_members
for delete to authenticated using (public.is_shop_owner(shop_id));

create policy "shop team manages client records" on public.clients
for select to authenticated using (
  public.is_shop_owner(shop_id) or user_id = (select auth.uid()) or exists (
    select 1 from public.appointments a
    where a.client_id = clients.id and a.shop_id = clients.shop_id
      and public.is_shop_barber(a.shop_id, a.barber_id)
  )
);
create policy "client sees own record" on public.clients
for select to authenticated using (user_id = (select auth.uid()));
create policy "team adds client records" on public.clients
for insert to authenticated with check (public.is_shop_member(shop_id) or public.is_shop_owner(shop_id));
create policy "customer creates own record at a public shop" on public.clients
for insert to authenticated with check (user_id = (select auth.uid()) and public.is_shop_public(shop_id));
create policy "team updates client records" on public.clients
for update to authenticated using (public.is_shop_owner(shop_id) or exists (
  select 1 from public.appointments a where a.client_id = clients.id and a.shop_id = clients.shop_id
    and public.is_shop_barber(a.shop_id, a.barber_id)
)) with check (public.is_shop_owner(shop_id) or exists (
  select 1 from public.appointments a where a.client_id = clients.id and a.shop_id = clients.shop_id
    and public.is_shop_barber(a.shop_id, a.barber_id)
));

create policy "public sees active services; team sees all" on public.services
for select to anon, authenticated using ((active and public.is_shop_public(shop_id)) or public.is_shop_member(shop_id) or public.is_shop_owner(shop_id));
create policy "owner manages services" on public.services
for all to authenticated using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

create policy "public sees business hours" on public.business_hours
for select to anon, authenticated using (public.is_shop_public(shop_id) or public.is_shop_member(shop_id) or public.is_shop_owner(shop_id));
create policy "owner manages business hours" on public.business_hours
for all to authenticated using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

create policy "public sees closed dates" on public.closed_dates
for select to anon, authenticated using (public.is_shop_public(shop_id) or public.is_shop_member(shop_id) or public.is_shop_owner(shop_id));
create policy "owner manages closed dates" on public.closed_dates
for all to authenticated using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

create policy "clients and shop team view appointments" on public.appointments
for select to authenticated using (
  public.is_shop_owner(shop_id) or public.is_shop_barber(shop_id, barber_id) or exists (
    select 1 from public.clients c where c.id = appointments.client_id and c.user_id = (select auth.uid())
  )
);
create policy "clients book for themselves" on public.appointments
for insert to authenticated with check (
  public.is_shop_owner(shop_id) or public.is_shop_barber(shop_id, barber_id) or exists (
    select 1 from public.clients c where c.id = appointments.client_id
      and c.shop_id = appointments.shop_id and c.user_id = (select auth.uid())
  )
);
create policy "owner or assigned barber updates appointment" on public.appointments
for update to authenticated using (
  public.is_shop_owner(shop_id) or public.is_shop_barber(shop_id, barber_id)
)
with check (
  public.is_shop_owner(shop_id) or public.is_shop_barber(shop_id, barber_id)
);
create policy "owner deletes appointment" on public.appointments
for delete to authenticated using (public.is_shop_owner(shop_id));

grant usage on schema public to anon, authenticated;
grant select on public.shops, public.shop_members, public.services, public.business_hours, public.closed_dates to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.shops, public.shop_members,
  public.clients, public.services, public.business_hours, public.closed_dates, public.appointments to authenticated;

