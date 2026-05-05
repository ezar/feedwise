create table if not exists highlights (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default now()
);

alter table highlights enable row level security;

create policy "highlights_own" on highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index highlights_article_user on highlights(article_id, user_id);
