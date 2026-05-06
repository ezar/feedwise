-- Composite index for the main feed sort: relevance_score DESC, published_at DESC
-- Allows Postgres to satisfy ORDER BY without a full table sort
create index if not exists idx_articles_score_date
  on articles(relevance_score desc nulls last, published_at desc);

-- Partial index for saved feed
create index if not exists idx_articles_saved_score
  on articles(relevance_score desc nulls last, published_at desc)
  where is_saved = true;
