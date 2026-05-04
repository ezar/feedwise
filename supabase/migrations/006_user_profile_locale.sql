alter table user_profile
  add column if not exists locale text not null default 'es'
    check (locale in ('es', 'en'));
