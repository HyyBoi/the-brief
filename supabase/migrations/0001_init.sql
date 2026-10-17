-- THE BRIEF. — schema
-- Run with `npm run db:setup` (uses DATABASE_URL) or paste into Supabase → SQL Editor.

create extension if not exists vector;

-- Articles: every article is processed by the AI exactly once, then shared by all readers.
create table if not exists articles (
  id            uuid primary key default gen_random_uuid(),
  url           text unique not null,
  source        text not null,
  region        text not null default 'global',      -- 'pk' | 'global'
  feed_section  text,                                 -- hint from the feed
  title         text not null,
  snippet       text,
  published_at  timestamptz not null default now(),
  -- filled by the AI pass
  summary       text,
  section       text,                                 -- one of lib/sections.ts
  topics        text[] not null default '{}',
  embedding     vector(768),
  processed     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists articles_published_idx on articles (published_at desc);
create index if not exists articles_unprocessed_idx on articles (processed) where processed = false;

-- Reader profile: what the paper has learned.
create table if not exists profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  dinner_answer   text,                                -- onboarding free text
  taste_summary   text,                                -- plain-language profile, editable
  interest_vector vector(768),
  topic_stats     jsonb not null default '{}'::jsonb,  -- { section: { a: number, b: number } }  Beta(a,b)
  time_budget     int not null default 10,             -- minutes
  onboarded       boolean not null default false,
  updated_at      timestamptz not null default now()
);

-- Daily snapshots of topic_stats → drift chart + Editor's Memo.
create table if not exists profile_snapshots (
  user_id     uuid references auth.users(id) on delete cascade,
  day         date not null,
  topic_stats jsonb not null,
  primary key (user_id, day)
);

-- One paper per reader per day.
create table if not exists editions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  edition_date date not null,
  number       int not null default 1,
  payload      jsonb not null,                         -- full rendered edition (stories, note, bench, quiz, memo)
  created_at   timestamptz not null default now(),
  unique (user_id, edition_date)
);

-- Every reading signal.
create table if not exists events (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  edition_id  uuid references editions(id) on delete cascade,
  article_id  uuid references articles(id) on delete cascade,
  kind        text not null,      -- dwell | open | click | keep | kill | quiz_right | quiz_wrong
  value       real not null default 1,
  created_at  timestamptz not null default now()
);
create index if not exists events_user_idx on events (user_id, created_at desc);

-- All access goes through the server with the service role; deny everything to anon/auth clients.
alter table articles          enable row level security;
alter table profiles          enable row level security;
alter table profile_snapshots enable row level security;
alter table editions          enable row level security;
alter table events            enable row level security;

-- Vector search: nearest recent articles to a reader's interest vector.
create or replace function match_articles(query vector(768), since timestamptz, n int)
returns table (id uuid, similarity float)
language sql stable as $$
  select a.id, 1 - (a.embedding <=> query) as similarity
  from articles a
  where a.processed and a.embedding is not null and a.published_at >= since
  order by a.embedding <=> query
  limit n;
$$;
