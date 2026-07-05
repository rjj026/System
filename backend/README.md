# DimReduce Backend

Express + TypeScript API for the DimReduce capstone project. Handles auth,
dataset upload/storage, and PDF report generation. PCA/LDA math itself stays
in the frontend (`frontend/src/lib/algorithms.ts`) — this backend exists to
give results a durable home: accounts, saved datasets, and exportable reports.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Server runs on `http://localhost:4000` by default. Health check:
`GET /api/health`.

## Storage

No external database required — uses simple JSON files under `src/data/`
(`users.json`, `datasets.json`, `reports.json`) plus raw files under
`src/storage/datasets/` and `src/storage/reports/`. This is intentional for a
capstone project: nothing to install or configure. Swap `src/data/jsonStore.ts`
for real Postgres/Mongo queries later if you need concurrent multi-user scale.

## API Reference

### Auth
- `POST /api/auth/register` — `{ email, password, name }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` — requires `Authorization: Bearer <token>` → current user

### Datasets (all require `Authorization: Bearer <token>`)
- `POST /api/datasets` — multipart form, field name `file`, CSV only →
  dataset metadata (row/column counts, detected label column)
- `GET /api/datasets` — list your uploaded datasets
- `GET /api/datasets/:id` — get one dataset's metadata
- `GET /api/datasets/:id/download` — download the original CSV
- `DELETE /api/datasets/:id` — remove a dataset

### Reports (all require `Authorization: Bearer <token>`)
- `POST /api/reports` — body:
  ```json
  {
    "datasetId": "uuid",
    "title": "PCA Analysis Report",
    "algorithm": "PCA",
    "metrics": { "Explained Variance (PC1)": "62.4%" },
    "sections": [{ "heading": "Overview", "content": "..." }],
    "table": { "headers": ["PC1", "PC2"], "rows": [[1.2, -0.4]] }
  }
  ```
  → report metadata + generates a PDF
- `GET /api/reports` — list your reports
- `GET /api/reports/:id/download` — download the generated PDF

## Connecting the frontend

In `frontend/.env`:
```
VITE_API_URL=http://localhost:4000
```

Store the JWT from login/register (e.g. in localStorage or React context) and
send it as `Authorization: Bearer <token>` on dataset/report requests.
