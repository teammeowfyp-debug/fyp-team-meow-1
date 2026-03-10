# AI Backend (Docker)

Runs Gemini calls server-side so the frontend doesn't ship the Gemini API key.

## Environment

- `GEMINI_API_KEY` (required)
- `GEMINI_MODEL` (optional, default: `gemini-3-flash-preview`)
- `PORT` (optional, default: `8080`)

## Run locally (no Docker)

```bash
cd backend
npm install
npm run dev
```

## Run with Docker

```bash
cd backend
docker build -t fyp-ai-backend .
docker compose up --build
```

## Endpoints

- `GET /health`
- `POST /ai/risk-summary`
- `POST /ai/risk-analysis`

