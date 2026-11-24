-- ==============================================================================
-- Migration: Create public.profiles and configure user-scoped RLS for scans
-- PhishIntel Implementation Guide Compliant
-- ==============================================================================

-- 1. Create public.profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 80)
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Grant table privileges
grant select, insert, update, delete on table public.profiles to authenticated, anon, service_role;

-- Policies for profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

-- 2. Trigger on auth.users to auto-create profile on signup / Google OAuth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Configure public.scans with user ownership
alter table public.scans
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists scans_user_id_created_at_idx
  on public.scans (user_id, created_at desc);

alter table public.scans enable row level security;
grant select, insert, update, delete on table public.scans to authenticated;
grant all on table public.scans to service_role;
revoke all on table public.scans from anon;
revoke all on table public.scans from public;

drop policy if exists "Allow all scan access" on public.scans;
drop policy if exists "scans_select_own" on public.scans;
drop policy if exists "scans_insert_own" on public.scans;
drop policy if exists "scans_update_own" on public.scans;
drop policy if exists "scans_delete_own" on public.scans;

-- Rows without an owner remain inaccessible until they can be safely reassigned.
create policy "scans_select_own"
on public.scans for select to authenticated
using ((select auth.uid()) = user_id);

create policy "scans_insert_own"
on public.scans for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "scans_update_own"
on public.scans for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "scans_delete_own"
on public.scans for delete to authenticated
using ((select auth.uid()) = user_id);
