create table feeds (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  url                 text not null,
  title               text,
  description         text,
  feed_type           text not null default 'manual'
                      check (feed_type in ('manual', 'topic')),
  topic_query         text,
  qstash_schedule_id  text,
  last_fetched_at     timestamptz,
  created_at          timestamptz default now(),
  unique(user_id, url)
);

alter table feeds enable row level security;

create policy "Users can view own feeds"
  on feeds for select using (auth.uid() = user_id);
create policy "Users can insert own feeds"
  on feeds for insert with check (auth.uid() = user_id);
create policy "Users can update own feeds"
  on feeds for update using (auth.uid() = user_id);
create policy "Users can delete own feeds"
  on feeds for delete using (auth.uid() = user_id);
