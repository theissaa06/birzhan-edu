# Frame School deployment notes

## Frontend on Layero

Layero must deploy the frontend app, not the monorepo root.

- Root Directory: `frontend`
- Framework: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Required variable: `VITE_API_URL=https://<backend-public-url>`

If `VITE_API_URL` is missing, the frontend falls back to `http://localhost:3003`, which only works locally.

## Backend service

Deploy the backend as a separate service.

Recommended root for the current repo layout:

- Root Directory: `backend`
- Install command: `npm install`
- Start command: `npm start`
- Migration command before/after deploy: `npm run db:migrate`

The canonical backend is now the top-level `backend` directory. Do not point Layero to the old nested `backend/backend` copy.

Required backend variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL=https://<layero-frontend-url>`
- `TURNSTILE_SECRET_KEY`
- `GEMINI_API_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Optional backend variables:

- `PORT`
- `FRONTEND_URLS` for comma-separated extra allowed origins
- `GEMINI_MODEL`
- `ALLOW_TURNSTILE_BYPASS=false`
- `OWNER_ID`, `OWNER_EMAIL` for admin/owner overrides
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`, `MAX_VIDEO_UPLOAD_MB`
- `PAYMENT_PROVIDER=cloudpayments`, `CLOUDPAYMENTS_PUBLIC_ID`, `CLOUDPAYMENTS_API_SECRET`, `ALLOW_PREMIUM_DEV_OVERRIDE=false`

Password reset emails use a 6-digit code and require working SMTP in production.
Assignment video uploads require Cloudflare R2 env variables and bucket CORS that allows `PUT` from the frontend origin.
Premium activation for CloudPayments-compatible providers is webhook-only; the browser payment callback must not grant access by itself.

## CORS check

The browser origin must match `FRONTEND_URL` exactly, including protocol and host. `http://localhost:5173` and `http://127.0.0.1:5173` are different origins.

After deploy, open the frontend and check:

- `/` renders the home page.
- `/courses` loads real courses from the backend.
- `/login` and `/register` render without console errors.
- Browser console has no CORS or `Network Error` messages.

## Local smoke test

In one terminal:

```bash
cd backend
npm run db:migrate
npm start
```

In another terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173/courses`. If courses load, the frontend, backend, Prisma client, and CORS are wired correctly for local development.

If local `/courses` fails with `Can't reach database server at localhost:5432`, start the project-local PostgreSQL cluster or another local PostgreSQL instance that matches `backend/.env`, then run:

```bash
cd backend
npm run db:migrate
node prisma/seed.js
```

Layero frontend variables are embedded during `npm run build`, so changing `VITE_API_URL` requires a new frontend build/deploy.
