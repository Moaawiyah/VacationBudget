-- Existing accounts retain email login; new signups store their identity here.
begin;
alter table public.profiles
  add column first_name text check (char_length(first_name) between 1 and 100),
  add column surname text check (char_length(surname) between 1 and 100),
  add column username text check (username ~ '^[a-z0-9_.-]{3,30}$');

-- NULL is allowed for legacy accounts. The constraint also handles signup races.
create unique index profiles_username_unique on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, surname, username)
  values (
    new.id,
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'surname'), ''),
    nullif(lower(btrim(new.raw_user_meta_data ->> 'username')), '')
  );
  return new;
end;
$$;
commit;
