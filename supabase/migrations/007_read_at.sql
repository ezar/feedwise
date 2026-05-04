alter table articles add column if not exists read_at timestamptz;

-- Backfill existing read articles using fetched_at as a proxy
update articles set read_at = fetched_at where is_read = true and read_at is null;

create index if not exists idx_articles_read_at on articles(read_at desc) where is_read = true;
