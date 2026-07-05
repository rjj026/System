export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface DatasetRecord {
  id: string;
  ownerId: string;
  originalName: string;
  storedFileName: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  labelColumn: string | null;
  uploadedAt: string;
}

export interface ReportRecord {
  id: string;
  ownerId: string;
  datasetId: string;
  title: string;
  algorithm: "PCA" | "LDA";
  storedFileName: string;
  createdAt: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
}
