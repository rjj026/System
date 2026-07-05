import { Router } from "express";
import { getDataset } from "../lib/datasetStore";
import { runPCA, runLDA } from "../lib/algorithms";
import { toNumericMatrix } from "../lib/fileParser";

const router = Router();

router.post("/dataset/:id/pca", (req, res) => {
  const dataset = getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: "Dataset not found." });

  const nComponents = parseInt(req.body?.nComponents, 10) || 2;
  const source = dataset.preprocessed?.normalized;
  const matrix = source && source.length > 0 ? source : toNumericMatrix(dataset.cleanedRows).matrix;

  if (matrix.length === 0 || matrix[0].length === 0) {
    return res.status(400).json({ error: "No numeric data available. Upload/preprocess a dataset first." });
  }

  const start = Date.now();
  const result = runPCA(matrix, nComponents);
  const runtimeMs = Date.now() - start;

  res.json({ ...result, runtimeMs });
});

router.post("/dataset/:id/lda", (req, res) => {
  const dataset = getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: "Dataset not found." });

  const nComponents = parseInt(req.body?.nComponents, 10) || 2;
  const labelColumnName: string | undefined = req.body?.labelColumn;

  const source = dataset.preprocessed?.normalized;
  const matrix = source && source.length > 0 ? source : toNumericMatrix(dataset.cleanedRows).matrix;

  if (matrix.length === 0 || matrix[0].length === 0) {
    return res.status(400).json({ error: "No numeric data available. Upload/preprocess a dataset first." });
  }

  let labels: number[] | undefined;
  if (labelColumnName) {
    const colIdx = dataset.headers.indexOf(labelColumnName);
    if (colIdx === -1) {
      return res.status(400).json({ error: `Column "${labelColumnName}" not found in dataset headers.` });
    }
    // Map arbitrary category values (strings or numbers) to integer class ids.
    const rawLabels = dataset.cleanedRows.map((row) => String(row[colIdx]));
    const uniqueVals = Array.from(new Set(rawLabels));
    labels = rawLabels.map((v) => uniqueVals.indexOf(v));
  }

  const start = Date.now();
  const result = runLDA(matrix, nComponents, labels);
  const runtimeMs = Date.now() - start;

  res.json({
    ...result,
    runtimeMs,
    note: result.usedPseudoLabels
      ? "No labelColumn was provided, so class groupings were generated via k-means clustering rather than true supervised labels. Pass a labelColumn for genuine supervised LDA."
      : undefined,
  });
});

export default router;
