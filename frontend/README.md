# Smart Delivery Frontend

React, TypeScript, Vite and Tailwind CSS client for the Smart Delivery API.

## Local development

Requirements: Node.js 20.19+ and a running Smart Delivery backend.

```bash
npm install
cp .env.example .env
npm run dev
```

By default, the frontend calls `http://localhost:8000/api/v1`. Set `VITE_API_URL` in `.env` to use another API URL.

Start the backend separately from `../back_end` after configuring PostgreSQL and applying migrations:

```bash
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

Create local demo accounts and sample deliveries from the backend directory with `python -m scripts.seed_demo`.
The development credentials are documented in `../back_end/README.md`.

## Account capabilities

- **Company:** create, edit, publish, and cancel deliveries; review recipients and reports.
- **Driver:** set availability, manage vehicles, accept and complete deliveries, and plan routes.
- **Administrator:** review accounts and update their status.

## Quality checks

```bash
npm run build
npm run lint
```
