# DIME System

Dimensionality Reduction Analysis System — upload a dataset, run quality checks,
preprocess it, and compare PCA vs. LDA.

```
dime-system/
├── frontend/   ← Vite + React + TypeScript + shadcn/ui (existing app)
└── backend/    ← Express + TypeScript API (upload, quality detection, real PCA/LDA)
```

## Getting started

**Backend** (start this first):
```bash
cd backend
npm install
npm run dev
# -> http://localhost:4000
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
# -> http://localhost:8080
```

The frontend's `vite.config.ts` should proxy `/api` requests to `http://localhost:4000`
during development (see the `server.proxy` block) so the two can talk to each other
without CORS configuration on the client side.

## What's real vs. what's a known gap

- PCA and LDA in `backend/src/lib/algorithms.ts` are genuinely computed (covariance/scatter
  matrices + Jacobi eigendecomposition) — not randomized placeholders.
- LDA needs a real class-label column to be *true* supervised LDA. See `backend/README.md`
  for details on the `labelColumn` parameter and the k-means fallback behavior when it's omitted.
- The dataset store is in-memory only (see `backend/README.md` for what that means for
  large files and server restarts).

See `backend/README.md` for the full API reference and limitations.
