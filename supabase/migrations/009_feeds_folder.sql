alter table feeds add column if not exists folder text;
create index if not exists idx_feeds_folder on feeds(user_id, folder) where folder is not null;
