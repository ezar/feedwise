-- Allow authenticated users to insert articles into their own feeds
create policy "Users can insert own articles"
  on articles for insert with check (
    feed_id in (select id from feeds where user_id = auth.uid())
  );
