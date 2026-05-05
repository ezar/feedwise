alter table articles add column if not exists tags text[] not null default '{}';
create index if not exists idx_articles_tags on articles using gin(tags);
