create table articles (
  id              uuid primary key default gen_random_uuid(),
  feed_id         uuid references feeds on delete cascade not null,
  guid            text not null unique,
  title           text not null,
  url             text not null,
  description     text,
  published_at    timestamptz,
  fetched_at      timestamptz default now(),

  relevance_score integer check (relevance_score between 0 and 100),
  ai_summary      text,
  ai_processed    boolean not null default false,

  is_read         boolean not null default false,
  is_saved        boolean not null default false
);

alter table articles enable row level security;

create policy "Users can view own articles"
  on articles for select using (
    feed_id in (select id from feeds where user_id = auth.uid())
  );
create policy "Users can update own articles"
  on articles for update using (
    feed_id in (select id from feeds where user_id = auth.uid())
  );

create index idx_articles_feed_published on articles(feed_id, published_at desc);
create index idx_articles_score on articles(relevance_score desc nulls last);
create index idx_articles_saved on articles(is_saved) where is_saved = true;
