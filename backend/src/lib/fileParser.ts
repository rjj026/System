import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

export interface ParsedFile {
  headers: string[];
  rows: (string | number)[][];
  supportedForAnalysis: boolean; // false for non-tabular files (images, pdfs, etc.)
}

const TABULAR_EXTENSIONS = [".csv", ".tsv", ".xlsx", ".xls", ".json"];

/**
 * Parses an uploaded file into headers + rows if it's a tabular format.
 * Any file type can be uploaded, but only tabular formats can feed the
 * numeric pipeline (quality detection, preprocessing, PCA/LDA). Non-tabular
 * files are stored but flagged as unsupported for analysis.
 */
export function parseFile(filePath: string, originalName: string): ParsedFile {
  const ext = path.extname(originalName).toLowerCase();

  if (!TABULAR_EXTENSIONS.includes(ext)) {
    return { headers: [], rows: [], supportedForAnalysis: false };
  }

  if (ext === ".csv" || ext === ".tsv") {
    const content = fs.readFileSync(filePath, "utf-8");
    const delimiter = ext === ".tsv" ? "\t" : ",";
    const records: string[][] = parse(content, {
      delimiter,
      skip_empty_lines: false,
      relax_column_count: true,
    });
    if (records.length === 0) return { headers: [], rows: [], supportedForAnalysis: true };
    const headers = records[0];
    const rows = records.slice(1).map((r) => r.map((cell) => coerceCell(cell)));
    return { headers, rows, supportedForAnalysis: true };
  }

  if (ext === ".xlsx" || ext === ".xls") {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (json.length === 0) return { headers: [], rows: [], supportedForAnalysis: true };
    const headers = (json[0] as unknown[]).map((h) => String(h));
    const rows = json.slice(1).map((r) => (r as unknown[]).map((cell) => coerceCell(cell)));
    return { headers, rows, supportedForAnalysis: true };
  }

  if (ext === ".json") {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { headers: [], rows: [], supportedForAnalysis: true };
    }
    const headers = Object.keys(parsed[0]);
    const rows = parsed.map((obj: Record<string, unknown>) => headers.map((h) => coerceCell(obj[h])));
    return { headers, rows, supportedForAnalysis: true };
  }

  return { headers: [], rows: [], supportedForAnalysis: false };
}

function coerceCell(cell: unknown): string | number {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "number") return cell;
  const str = String(cell).trim();
  if (str === "") return "";
  const asNum = Number(str);
  return !Number.isNaN(asNum) && str !== "" ? asNum : str;
}

/** Extract only the numeric columns as a plain number[][] for PCA/LDA/preprocessing. */
export function toNumericMatrix(rows: (string | number)[][]): { matrix: number[][]; numericColumns: number[] } {
  if (rows.length === 0) return { matrix: [], numericColumns: [] };
  const cols = rows[0].length;
  const numericColumns: number[] = [];

  for (let j = 0; j < cols; j++) {
    const isNumeric = rows.every((r) => typeof r[j] === "number" || r[j] === "");
    if (isNumeric) numericColumns.push(j);
  }

  const matrix = rows.map((row) => numericColumns.map((j) => (typeof row[j] === "number" ? (row[j] as number) : NaN)));
  return { matrix, numericColumns };
}
