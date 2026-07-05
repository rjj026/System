import { Router } from "express";
import { getDataset, updateDataset, listDatasets } from "../lib/datasetStore";
import { preprocessData } from "../lib/algorithms";
import { toNumericMatrix } from "../lib/fileParser";

const router = Router();

router.get("/datasets", (_req, res) => {
  res.json(listDatasets());
});

router.get("/dataset/:id", (req, res) => {
  const dataset = getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: "Dataset not found." });

  const page = parseInt((req.query.page as string) || "1", 10);
  const pageSize = parseInt((req.query.pageSize as string) || "50", 10);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  res.json({
    id: dataset.id,
    originalName: dataset.originalName,
    headers: dataset.headers,
    qualityReport: dataset.qualityReport,
    before: {
      rows: dataset.rawRows.slice(start, end),
      total: dataset.rawRows.length,
      page,
      pageSize,
    },
    after: {
      rows: dataset.cleanedRows.slice(start, end),
      total: dataset.cleanedRows.length,
      page,
      pageSize,
    },
  });
});

router.post("/dataset/:id/preprocess", (req, res) => {
  const dataset = getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: "Dataset not found." });

  const { matrix } = toNumericMatrix(dataset.cleanedRows);
  if (matrix.length === 0 || matrix[0].length === 0) {
    return res.status(400).json({ error: "No numeric columns available to preprocess." });
  }

  const start = Date.now();
  const result = preprocessData(matrix);
  const runtimeMs = Date.now() - start;

  updateDataset(dataset.id, { preprocessed: result });

  res.json({ ...result, runtimeMs, rows: matrix.length, cols: matrix[0].length });
});

export default router;
