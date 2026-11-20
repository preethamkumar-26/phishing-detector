-- ==============================================================================
-- Migration: Add delete_user() RPC function for authenticated account self-deletion
-- ==============================================================================

-- Creates a secure definer function allowing authenticated users to delete
-- their own user record from auth.users.
-- Since public.profiles and public.scans reference auth.users(id) with ON DELETE CASCADE,
-- deleting from auth.users automatically purges all associated profile and scan rows.

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only allow users to delete their own account
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.delete_user() to authenticated;
