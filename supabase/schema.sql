-- LaptopHub PH database schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$ begin
  create type rental_type as enum ('hourly','overnight');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('pending','confirmed','active','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash','gcash');
exception when duplicate_object then null; end $$;

create table if not exists laptops (
  id bigint primary key generated always as identity,
  name text not null unique,
  status text not null default 'available' check (status in ('available','maintenance','inactive')),
  created_at timestamptz not null default now()
);

insert into laptops (name) values
('Laptop 01'),('Laptop 02'),('Laptop 03'),('Laptop 04'),('Laptop 05'),
('Laptop 06'),('Laptop 07'),('Laptop 08'),('Laptop 09'),('Laptop 10')
on conflict (name) do nothing;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text unique not null default ('LH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,7))),
  customer_name text not null,
  phone text not null,
  age integer,
  id_type text,
  rental_type rental_type not null,
  laptop_id bigint not null references laptops(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  hours numeric not null,
  total numeric(10,2) not null,
  payment_method payment_method not null,
  status booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint valid_range check (end_at > start_at),
  constraint overnight_age_check check (rental_type <> 'overnight' or (age is not null and age >= 18 and id_type is not null))
);

create index if not exists bookings_laptop_time_idx on bookings(laptop_id,start_at,end_at);

-- Prevent overlapping active reservations for the same laptop.
create extension if not exists btree_gist;
alter table bookings drop constraint if exists no_overlap;
alter table bookings add constraint no_overlap exclude using gist (
  laptop_id with =,
  tstzrange(start_at,end_at,'[)') with &&
) where (status in ('pending','confirmed','active'));

alter table bookings enable row level security;
alter table laptops enable row level security;

-- Public users may see laptop names and current availability data through the app.
drop policy if exists "public read laptops" on laptops;
create policy "public read laptops" on laptops for select using (true);

-- Public booking inserts are allowed because this is a reservation kiosk/site.
-- For production, add rate limiting / CAPTCHA and admin authentication.
drop policy if exists "public create bookings" on bookings;
create policy "public create bookings" on bookings for insert with check (true);

drop policy if exists "public read bookings" on bookings;
create policy "public read bookings" on bookings for select using (true);

-- RPC validates availability and inserts atomically.
create or replace function create_booking(
  p_customer_name text,
  p_phone text,
  p_age integer,
  p_id_type text,
  p_rental_type rental_type,
  p_laptop_id bigint,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_hours numeric,
  p_total numeric,
  p_payment_method payment_method
) returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare result bookings;
begin
  if p_rental_type = 'overnight' and (p_age is null or p_age < 18 or coalesce(trim(p_id_type),'') = '') then
    raise exception 'Overnight take-home requires age 18+ and a valid ID.';
  end if;
  if p_start_at >= p_end_at then raise exception 'Invalid rental period.'; end if;
  if p_rental_type = 'hourly' then
    if extract(hour from p_start_at at time zone 'Asia/Manila') < 8 or extract(hour from p_end_at at time zone 'Asia/Manila') > 17 then
      raise exception 'Hourly reservations must be between 8:00 AM and 5:00 PM.';
    end if;
  else
    if (p_start_at at time zone 'Asia/Manila')::time <> time '17:00' or (p_end_at at time zone 'Asia/Manila')::time <> time '08:00' then
      raise exception 'Overnight reservations run from 5:00 PM to 8:00 AM.';
    end if;
  end if;
  if exists(select 1 from bookings where laptop_id=p_laptop_id and status in ('pending','confirmed','active') and tstzrange(start_at,end_at,'[)') && tstzrange(p_start_at,p_end_at,'[)')) then
    raise exception 'That laptop is no longer available for the selected time.';
  end if;
  insert into bookings(customer_name,phone,age,id_type,rental_type,laptop_id,start_at,end_at,hours,total,payment_method)
  values(p_customer_name,p_phone,p_age,p_id_type,p_rental_type,p_laptop_id,p_start_at,p_end_at,p_hours,p_total,p_payment_method)
  returning * into result;
  return result;
end;
$$;
