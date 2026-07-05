import { QualityReport } from "./dataQuality";

export interface StoredDataset {
  id: string;
  originalName: string;
  headers: string[];
  rawRows: (string | number)[][]; // before cleaning
  cleanedRows: (string | number)[][]; // after removing blanks/duplicates
  numericColumns: number[];
  qualityReport: QualityReport;
  supportedForAnalysis: boolean;
  createdAt: number;
  preprocessed?: {
    normalized: number[][];
    missingValuesHandled: number;
    outliersRemoved: number;
    scalingMethod: string;
  };
}

// NOTE: in-memory store — fine for a single-instance dev/demo backend.
// Restarting the server clears all uploaded datasets. For production use,
// swap this for a real database or persistent file store.
const store = new Map<string, StoredDataset>();

export function saveDataset(dataset: StoredDataset) {
  store.set(dataset.id, dataset);
}

export function getDataset(id: string): StoredDataset | undefined {
  return store.get(id);
}

export function updateDataset(id: string, patch: Partial<StoredDataset>) {
  const existing = store.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  store.set(id, updated);
  return updated;
}

export function listDatasets(): Pick<StoredDataset, "id" | "originalName" | "createdAt" | "qualityReport">[] {
  return Array.from(store.values()).map((d) => ({
    id: d.id,
    originalName: d.originalName,
    createdAt: d.createdAt,
    qualityReport: d.qualityReport,
  }));
}
