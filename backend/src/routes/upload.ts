import { Router } from "express";
import { randomUUID } from "crypto";
import { upload } from "../middleware/uploadMiddleware";
import { parseFile, toNumericMatrix } from "../lib/fileParser";
import { analyzeQuality, cleanRows } from "../lib/dataQuality";
import { saveDataset, StoredDataset } from "../lib/datasetStore";

const router = Router();

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const start = Date.now();

  try {
    const parsed = parseFile(req.file.path, req.file.originalname);

    if (!parsed.supportedForAnalysis) {
      // Non-tabular file: stored, but nothing to analyze.
      const id = randomUUID();
      return res.json({
        id,
        originalName: req.file.originalname,
        supportedForAnalysis: false,
        message:
          "File uploaded successfully, but this file type isn't tabular data (CSV/TSV/XLSX/JSON), so quality checks and PCA/LDA don't apply to it.",
      });
    }

    const qualityReport = analyzeQuality(parsed.rows);
    const cleaned = cleanRows(parsed.rows, qualityReport);
    const { numericColumns } = toNumericMatrix(parsed.rows);

    const id = randomUUID();
    const dataset: StoredDataset = {
      id,
      originalName: req.file.originalname,
      headers: parsed.headers,
      rawRows: parsed.rows,
      cleanedRows: cleaned,
      numericColumns,
      qualityReport,
      supportedForAnalysis: true,
      createdAt: Date.now(),
    };
    saveDataset(dataset);

    const totalRuntimeMs = Date.now() - start;

    res.json({
      id,
      originalName: req.file.originalname,
      headers: parsed.headers,
      supportedForAnalysis: true,
      rowsBefore: qualityReport.rowsBefore,
      rowsAfter: qualityReport.rowsAfter,
      duplicates: qualityReport.duplicates,
      nullCells: qualityReport.nullCells,
      blankCells: qualityReport.blankCells,
      numericColumnCount: numericColumns.length,
      runtimeMs: totalRuntimeMs,
      preview: {
        before: parsed.rows.slice(0, 20),
        after: cleaned.slice(0, 20),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to parse file.", detail: (err as Error).message });
  }
});

export default router;
