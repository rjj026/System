import { Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { jsonStore } from "../data/jsonStore.js";
import { DatasetRecord } from "../types/index.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASETS_DIR = path.join(__dirname, "..", "storage", "datasets");
const DATASETS = "datasets";

/** Reads just enough of the file to report column headers and row count,
 * without loading the whole CSV into memory — safe for large files. */
function inspectCsv(filePath: string): { columns: string[]; rowCount: number } {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((line) => line.length > 0);
  const header = lines[0] ?? "";
  const columns = header.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const rowCount = Math.max(0, lines.length - 1);
  return { columns, rowCount };
}

/** Heuristic label-column detection: looks for a column literally named
 * "label"/"class"/"target", falling back to null if none match. Mirrors
 * the same heuristic used client-side in lib/algorithms.ts. */
function detectLabelColumn(columns: string[]): string | null {
  const candidates = ["label", "class", "target", "category", "outcome"];
  const match = columns.find((c) => candidates.includes(c.toLowerCase()));
  return match ?? null;
}

export async function uploadDataset(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Attach a .csv file under field name 'file'." });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const filePath = path.join(DATASETS_DIR, req.file.filename);
  let inspected: { columns: string[]; rowCount: number };
  try {
    inspected = inspectCsv(filePath);
  } catch (err) {
    fs.unlinkSync(filePath);
    return res.status(400).json({ error: "Could not parse CSV file" });
  }

  const record: DatasetRecord = {
    id: uuidv4(),
    ownerId: req.user.userId,
    originalName: req.file.originalname,
    storedFileName: req.file.filename,
    rowCount: inspected.rowCount,
    columnCount: inspected.columns.length,
    columns: inspected.columns,
    labelColumn: detectLabelColumn(inspected.columns),
    uploadedAt: new Date().toISOString(),
  };

  jsonStore.insert(DATASETS, record);
  return res.status(201).json(record);
}

export function listDatasets(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const datasets = jsonStore.findMany<DatasetRecord>(DATASETS, (d) => d.ownerId === req.user!.userId);
  return res.json(datasets);
}

export function getDataset(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const dataset = jsonStore.findOne<DatasetRecord>(
    DATASETS,
    (d) => d.id === req.params.id && d.ownerId === req.user!.userId
  );
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });
  return res.json(dataset);
}

export function downloadDataset(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const dataset = jsonStore.findOne<DatasetRecord>(
    DATASETS,
    (d) => d.id === req.params.id && d.ownerId === req.user!.userId
  );
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });

  const filePath = path.join(DATASETS_DIR, dataset.storedFileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File missing on disk" });

  return res.download(filePath, dataset.originalName);
}

export function deleteDataset(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const dataset = jsonStore.findOne<DatasetRecord>(
    DATASETS,
    (d) => d.id === req.params.id && d.ownerId === req.user!.userId
  );
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });

  const filePath = path.join(DATASETS_DIR, dataset.storedFileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  jsonStore.remove(DATASETS, dataset.id);

  return res.status(204).send();
}
