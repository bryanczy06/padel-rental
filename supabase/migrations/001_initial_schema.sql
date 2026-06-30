-- ============================================================
-- Padel Club Rental Management — Initial Schema
-- Multi-tenant: every table scoped to a club via club_id
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── CLUBS ───────────────────────────────────────────────────
create table clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,        -- e.g. "padel-tlv"
  owner_id    uuid,                        -- references auth.users
  created_at  timestamptz default now()
);

-- ─── PROFILES (extends Supabase auth.users) ──────────────────
-- role: 'super_admin' | 'admin' | 'staff'
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  phone       text,
  role        text not null default 'staff'
                check (role in ('super_admin', 'admin', 'staff')),
  club_id     uuid references clubs(id) on delete cascade,
  created_at  timestamptz default now()
);

-- ─── CUSTOMERS ───────────────────────────────────────────────
create table customers (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  full_name   text not null,
  email       text,
  phone       text,
  qr_code     text unique not null default gen_random_uuid()::text,
  created_at  timestamptz default now()
);

-- ─── RACKETS ─────────────────────────────────────────────────
-- status: 'available' | 'rented' | 'repair'
create table rackets (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references clubs(id) on delete cascade,
  name          text not null,             -- e.g. "Racket #7"
  brand         text,
  status        text not null default 'available'
                  check (status in ('available', 'rented', 'repair')),
  usage_count   integer not null default 0,
  qr_code       text unique not null default gen_random_uuid()::text,
  notes         text,
  created_at    timestamptz default now()
);

-- ─── RENTALS ─────────────────────────────────────────────────
-- condition: 'good' | 'damaged'
create table rentals (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references clubs(id) on delete cascade,
  customer_id   uuid not null references customers(id),
  racket_id     uuid not null references rackets(id),
  rented_by     uuid references profiles(id),   -- staff who rented it out
  returned_by   uuid references profiles(id),   -- staff who accepted return
  started_at    timestamptz not null default now(),
  returned_at   timestamptz,
  condition     text check (condition in ('good', 'damaged')),
  notes         text
);

-- ─── INDEXES ─────────────────────────────────────────────────
create index on customers(club_id);
create index on rackets(club_id);
create index on rentals(club_id);
create index on rentals(racket_id) where returned_at is null;  -- open rentals
create index on rentals(customer_id);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table clubs     enable row level security;
alter table profiles  enable row level security;
alter table customers enable row level security;
alter table rackets   enable row level security;
alter table rentals   enable row level security;

-- Helper: get current user's club_id
create or replace function my_club_id()
returns uuid language sql stable as $$
  select club_id from profiles where id = auth.uid()
$$;

-- Helper: get current user's role
create or replace function my_role()
returns text language sql stable as $$
  select role from profiles where id = auth.uid()
$$;

-- CLUBS: super_admin sees all; admin/staff see only their club
create policy "clubs_select" on clubs for select using (
  my_role() = 'super_admin' or id = my_club_id()
);
create policy "clubs_insert" on clubs for insert with check (
  my_role() = 'super_admin'
);
create policy "clubs_update" on clubs for update using (
  my_role() = 'super_admin' or id = my_club_id()
);

-- PROFILES: users see profiles in their club; super_admin sees all
create policy "profiles_select" on profiles for select using (
  my_role() = 'super_admin' or club_id = my_club_id()
);
create policy "profiles_insert" on profiles for insert with check (
  my_role() in ('super_admin', 'admin')
);
create policy "profiles_update" on profiles for update using (
  my_role() in ('super_admin', 'admin') or id = auth.uid()
);
create policy "profiles_delete" on profiles for delete using (
  my_role() in ('super_admin', 'admin')
);

-- CUSTOMERS: scoped to club
create policy "customers_select" on customers for select using (club_id = my_club_id() or my_role() = 'super_admin');
create policy "customers_insert" on customers for insert with check (club_id = my_club_id());
create policy "customers_update" on customers for update using (club_id = my_club_id());
create policy "customers_delete" on customers for delete using (my_role() in ('super_admin','admin') and club_id = my_club_id());

-- RACKETS: scoped to club
create policy "rackets_select" on rackets for select using (club_id = my_club_id() or my_role() = 'super_admin');
create policy "rackets_insert" on rackets for insert with check (club_id = my_club_id() and my_role() in ('super_admin','admin'));
create policy "rackets_update" on rackets for update using (club_id = my_club_id());
create policy "rackets_delete" on rackets for delete using (my_role() in ('super_admin','admin') and club_id = my_club_id());

-- RENTALS: scoped to club
create policy "rentals_select" on rentals for select using (club_id = my_club_id() or my_role() = 'super_admin');
create policy "rentals_insert" on rentals for insert with check (club_id = my_club_id());
create policy "rentals_update" on rentals for update using (club_id = my_club_id());

-- ─── TRIGGER: auto-create profile on signup ──────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, role, club_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'staff'),
    (new.raw_user_meta_data->>'club_id')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
