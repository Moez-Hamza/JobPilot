-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Table: user_preferences (single-row config)
create table if not exists user_preferences (
  id              int primary key default 1,
  target_titles   text[] not null default '{"Full Stack Developer","Backend Engineer"}',
  target_locations text[] not null default '{"Tunis","Paris"}',
  experience_level varchar(50) not null default 'Mid',
  keywords_include text[] not null default '{"Python","React","TypeScript","Node.js"}',
  keywords_exclude text[] not null default '{"Crypto","Web3","Blockchain"}'
);

-- Seed default preferences
insert into user_preferences (id, target_titles, target_locations, experience_level, keywords_include, keywords_exclude)
values (
  1,
  '{"Full Stack Developer","Backend Engineer","Software Engineer"}',
  '{"Tunis","Paris"}',
  'Mid',
  '{"Python","React","TypeScript","Node.js","FastAPI","Next.js"}',
  '{"Crypto","Web3","Blockchain","NFT"}'
)
on conflict (id) do nothing;

-- Table: jobs
create table if not exists jobs (
  id                        uuid primary key default gen_random_uuid(),
  title                     varchar(255) not null,
  company                   varchar(255) not null,
  location                  varchar(255) not null,
  job_description           text,
  url                       text unique not null,
  status                    varchar(50) not null default 'Matched'
                              check (status in ('Matched','Applied','Interviewing','Rejected','Offer')),
  date_discovered           timestamptz not null default now(),
  date_applied              timestamptz,
  rejection_email_raw       text,
  rejection_reason_category varchar(100),
  ai_feedback_notes         text
);

-- Index for fast status filtering
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_date_discovered on jobs(date_discovered desc);

-- Enable Row Level Security (optional for self-hosted, required for public Supabase)
alter table user_preferences enable row level security;
alter table jobs enable row level security;

-- Allow all operations for authenticated users (adjust per your auth setup)
create policy "Allow all for authenticated" on user_preferences
  for all using (true) with check (true);

create policy "Allow all for authenticated" on jobs
  for all using (true) with check (true);
