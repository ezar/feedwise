create table user_profile (
  id          uuid primary key references auth.users on delete cascade,
  interests   text not null default '',
  threshold   integer not null default 50 check (threshold between 0 and 100),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table user_profile enable row level security;

create policy "Users can view own profile"
  on user_profile for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on user_profile for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on user_profile for update using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profile (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
