# DIME System — Backend

Express + TypeScript backend for the DIME (Dimensionality Reduction) System.
Handles file upload, data quality detection, preprocessing, and real PCA/LDA computation.

## Setup

```bash
cd backend
npm install
npm run dev
```

Server runs on `http://localhost:4000` by default (override with `PORT` env var).

## Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/upload` | Multipart file upload (`file` field). Parses CSV/TSV/XLSX/JSON, runs quality detection. |
| GET | `/api/datasets` | List all uploaded datasets (in-memory, current server session only) |
| GET | `/api/dataset/:id?page=1&pageSize=50` | Paginated before/after view of a dataset |
| POST | `/api/dataset/:id/preprocess` | Runs z-score normalization + outlier handling |
| POST | `/api/dataset/:id/pca` | Body: `{ "nComponents": 2 }`. Runs real PCA (covariance + Jacobi eigendecomposition). |
| POST | `/api/dataset/:id/lda` | Body: `{ "nComponents": 2, "labelColumn": "label" }`. Runs real LDA. `labelColumn` should name a column in your original headers containing class values. If omitted, falls back to k-means pseudo-labels (not true supervised LDA — see note in the response). |

## Known limitations (read before treating this as production-ready)

- **In-memory dataset store.** Restarting the server clears everything. Swap `src/lib/datasetStore.ts` for a real database (Postgres, SQLite, etc.) for persistence.
- **Large files (1M+ rows).** Uploaded files are streamed to disk via `multer`, but parsing loads the full row set into memory as a JS array for quality detection and analysis. This works for datasets in the tens-to-low-hundreds-of-MB range on typical hardware, but true web-scale (many millions of rows, GB-sized files) needs a streaming/chunked pipeline and probably a real database — this backend does not do that yet.
- **LDA without a label column** falls back to k-means clustering, which produces a *classification-agreement* number, not a true supervised classification accuracy. Pass `labelColumn` whenever your dataset actually has a class/target column.
- **No auth.** Anyone who can reach this server can upload/read datasets. Add authentication before deploying anywhere public.

## Real algorithms, not simulated

Unlike an earlier version of this codebase's `algorithms.ts`, PCA and LDA here are computed from the actual data:

- **PCA**: standardization → covariance matrix → Jacobi eigenvalue decomposition → sorted eigenvectors → projection.
- **LDA**: within/between-class scatter matrices → symmetric whitening trick to solve the generalized eigenproblem → projection → real nearest-centroid classification accuracy.

Same input always produces the same output (no `Math.random()` in the math).
