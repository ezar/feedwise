alter table articles add column if not exists reader_opened_at timestamptz;

create index if not exists idx_articles_reader_opened
  on articles(reader_opened_at desc) where reader_opened_at is not null;
