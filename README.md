# JobPilot — AI-Powered Job Search Assistant

JobPilot automates your job search by scraping LinkedIn for relevant positions based on your preferences, using AI to match and rank them, and tracking your applications from first contact to offer.

## Features

- **Auto-scraping** — Daily LinkedIn job scraping via Apify, filtered by your target titles and locations
- **Matched Jobs Dashboard** — Paginated view of jobs that match your preferences
- **Application Tracker** — Track every application across Applied → Interviewing → Offer / Rejected
- **AI Resume Optimizer** — Optimize your resume bullets against a specific job description
- **Rejection Analyzer** — AI-powered analysis of rejection emails to identify weaknesses
- **Preferences** — Configure target titles, locations, keywords include/exclude

## Tech Stack

- **Frontend** — Next.js 15, TailwindCSS, TypeScript
- **Backend** — FastAPI (Python), PostgreSQL, APScheduler
- **Scraping** — Apify (`curious_coder~linkedin-jobs-scraper`)
- **AI** — OpenAI / GitHub Models

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL

### Local Development

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn app.main:app --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker

```bash
cp backend/.env.example backend/.env   # fill in your keys
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI or GitHub Models API key |
| `OPENAI_BASE_URL` | Optional — for GitHub Models endpoint |
| `APIFY_API_KEY` | Apify API token for LinkedIn scraping |
| `DISCORD_WEBHOOK_URL` | Optional — new job notifications |
| `SLACK_WEBHOOK_URL` | Optional — new job notifications |
