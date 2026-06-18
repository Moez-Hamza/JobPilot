-- Local PostgreSQL schema (no Supabase extensions needed)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS user_preferences (
  id              INT PRIMARY KEY DEFAULT 1,
  target_titles   TEXT[] NOT NULL DEFAULT '{"Full Stack Developer","Backend Engineer"}',
  target_locations TEXT[] NOT NULL DEFAULT '{"Tunis","Paris"}',
  experience_level VARCHAR(50) NOT NULL DEFAULT 'Mid',
  keywords_include TEXT[] NOT NULL DEFAULT '{"Python","React","TypeScript","Node.js"}',
  keywords_exclude TEXT[] NOT NULL DEFAULT '{"Crypto","Web3","Blockchain"}'
);

INSERT INTO user_preferences (id, target_titles, target_locations, experience_level, keywords_include, keywords_exclude)
VALUES (
  1,
  '{"Full Stack Developer","Backend Engineer","Software Engineer"}',
  '{"Tunis","Paris"}',
  'Mid',
  '{"Python","React","TypeScript","Node.js","FastAPI","Next.js"}',
  '{"Crypto","Web3","Blockchain","NFT"}'
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS jobs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                     VARCHAR(255) NOT NULL,
  company                   VARCHAR(255) NOT NULL,
  location                  VARCHAR(255) NOT NULL,
  job_description           TEXT,
  url                       TEXT UNIQUE NOT NULL,
  status                    VARCHAR(50) NOT NULL DEFAULT 'Matched'
                              CHECK (status IN ('Matched','Applied','Interviewing','Rejected','Offer')),
  date_discovered           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_applied              TIMESTAMPTZ,
  rejection_email_raw       TEXT,
  rejection_reason_category VARCHAR(100),
  ai_feedback_notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_date_discovered ON jobs(date_discovered DESC);
