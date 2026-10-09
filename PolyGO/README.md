# PolyGO

**An AI lecture assistant that transcribes lectures, explains hard terms in plain language and translates them.**

> **Status: MVP prototype, development paused.** PolyGO started as a solo university project in 2024 after my friends and I struggled to follow fast lectures and unfamiliar terminology. The backend and data model are the most developed parts; the interface is minimal. See [Known limitations](#known-limitations) and the [roadmap](docs/ROADMAP.md).

## What it does

- **Speech-to-text**: upload an audio file, or stream microphone audio over a WebSocket for live transcription (Google Cloud Speech-to-Text; audio is converted with FFmpeg first).
- **Plain-language explanations**: ask about a term and get a short, student-friendly answer from an LLM (OpenAI or DeepSeek, selectable by config).
- **Lecture analysis**: key point extraction, summaries and key point relationships, generated on the server.
- **Translation**: translate text into ten languages with Google Cloud Translation.
- **Accounts and plans**: Supabase authentication, a Postgres schema protected with Row Level Security, and Stripe subscription scaffolding.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, React, Tailwind CSS |
| Backend | Node.js, Express, WebSockets, FFmpeg |
| Data and auth | Supabase (PostgreSQL with Row Level Security) |
| AI and cloud | Google Cloud Speech-to-Text, Translation and Storage; OpenAI or DeepSeek |
| Payments | Stripe |

```
Browser (Next.js)  ──HTTP / WebSocket──▶  Express API  ──▶  Google Cloud (speech, translate, storage)
        │                                      │       └──▶  OpenAI / DeepSeek
        └──────────── Supabase (auth + Postgres, RLS) ◀────────┘
```

## Run it locally

You will need Node.js 20+, [pnpm](https://pnpm.io), [FFmpeg](https://ffmpeg.org) on your PATH, and your own accounts for Google Cloud, Supabase and an AI provider.

```bash
git clone https://github.com/LizarCummit/PolyGO.git
cd PolyGO
pnpm install

# Configure the two apps (no real keys are stored in this repository)
cp translation-saas-backend/.env.example translation-saas-backend/.env
cp translation-saas-frontend/.env.example translation-saas-frontend/.env.local
# ...then fill in the values. Keep your Google service-account key file OUTSIDE the repo
# and point GOOGLE_APPLICATION_CREDENTIALS at it.

pnpm dev    # backend on :4000, frontend on :3000
```

Database migrations live in `translation-saas-frontend/supabase/migrations` and `translation-saas-backend/src/db/migrations`.

## Security notes

- Secrets are loaded from environment variables only. `.env` files, key files and uploads are git-ignored.
- AI provider keys stay on the server; the browser calls the API, never the AI provider directly.
- FFmpeg is run with an argument array (no shell), and request bodies and headers are not logged.
- CORS is restricted to `FRONTEND_URL`.

## Known limitations

- The interface is basic and not yet responsive or accessible.
- Several API routes (`/explain`, `/ai/*`, `/translate`, `/speech-to-text`) have no authentication or rate limiting. Add both before any public deployment.
- The lecture dashboard calls a `/transcribe` route that this backend does not implement yet.
- The transcription language is fixed to `en-US` in the streaming and file endpoints.
- Test files exist in `translation-saas-backend/tests/features`, but there is no test runner configured yet.

## Author

Built by Khang Gia Tran, IT student in Adelaide, South Australia. [LinkedIn](https://www.linkedin.com/in/khang-tran-b23684297)
