# JobPilot – Automated Job Tracker & AI Feedback Loop

A self-hosted job hunting dashboard that discovers jobs, tracks applications, and uses AI to turn rejection emails into actionable resume improvements.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 + Tailwind CSS v4 |
| Backend | Python FastAPI + APScheduler |
| Database | Supabase (PostgreSQL) |
| Scraping | Apify LinkedIn Jobs Scraper |
| AI Engine | OpenAI gpt-4o-mini |
| Notifications | Discord / Slack Webhooks |

## Features

- **Dashboard** – Filterable list of matched jobs with one-click "Mark Applied" / "Dismiss"
- **Tracker** – Kanban-style pipeline (Applied → Interviewing → Offer / Rejected) with manual job entry
- **AI Rejection Analyzer** – Paste a rejection email → AI categorizes the reason and extracts resume gaps
- **AI Resume Optimizer** – Paste a job description + your bullets → AI rewrites them using your historical rejection insights
- **Daily Scraper** – Background job runs at 08:00 daily via Apify, filters by your preferences, deduplicates, and sends webhook notifications

## Project Structure

```
JobPilot/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS + lifespan
│   │   ├── config.py        # Pydantic settings (.env)
│   │   ├── database.py      # Supabase client singleton
│   │   ├── models.py        # Pydantic request/response models
│   │   ├── scheduler.py     # APScheduler daily scrape
│   │   └── routes/
│   │       ├── jobs.py      # CRUD + status updates
│   │       ├── preferences.py
│   │       ├── scraper.py   # Apify trigger + filtering
│   │       └── ai.py        # Rejection analysis + resume optimizer
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Dashboard (Matched jobs)
│   │   ├── tracker/         # Application pipeline
│   │   ├── optimizer/       # AI resume workspace
│   │   └── settings/        # Job preferences
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── JobCard.tsx
│   │   ├── JobDetailModal.tsx
│   │   └── StatusBadge.tsx
│   └── lib/api.ts           # Typed API client
└── database/
    └── schema.sql           # Run once in Supabase SQL Editor
```

## Setup

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run the full contents of `database/schema.sql`

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in all keys in .env

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
cp env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Backend (`backend/.env`)

```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
APIFY_API_KEY=your-apify-api-key
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...   # optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...     # optional
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/preferences` | Get user preferences |
| PUT | `/preferences` | Update preferences |
| GET | `/jobs` | List jobs (filter by `status`, `search`) |
| POST | `/jobs` | Create job manually |
| PATCH | `/jobs/{id}/status` | Update job status |
| DELETE | `/jobs/{id}` | Delete job |
| POST | `/scraper/trigger` | Trigger Apify scrape now |
| POST | `/ai/analyze-rejection/{id}` | Analyze rejection email with AI |
| POST | `/ai/optimize-resume` | Rewrite resume bullets with AI |

## Deployment

- **Backend**: Deploy to [Railway](https://railway.app), [Render](https://render.com), or any Docker-capable host. Set env vars in the platform dashboard.
- **Frontend**: Deploy to [Vercel](https://vercel.com) — connect the `frontend/` subdirectory, set `NEXT_PUBLIC_API_URL` to your backend URL.
- **Database**: Supabase is already hosted — nothing to deploy.

> For production, update `allow_origins` in `backend/app/main.py` to your actual frontend domain.
