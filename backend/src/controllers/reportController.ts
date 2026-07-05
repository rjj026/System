import { Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";
import { jsonStore } from "../data/jsonStore.js";
import { ReportRecord, DatasetRecord } from "../types/index.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, "..", "storage", "reports");
const REPORTS = "reports";
const DATASETS = "datasets";

interface ReportRequestBody {
  datasetId: string;
  title?: string;
  algorithm: "PCA" | "LDA";
  metrics?: Record<string, string | number>;
  sections?: { heading: string; content: string }[];
  table?: { headers: string[]; rows: (string | number)[][] };
}

/** Renders the report to a PDF file on disk and returns the file name.
 * Kept intentionally generic: the frontend computes PCA/LDA in-browser
 * (see src/lib/algorithms.ts) and posts the results here purely for
 * durable, printable output — the backend does not redo any math. */
function renderReportPdf(body: ReportRequestBody, dataset: DatasetRecord | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileName = `${uuidv4()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text(body.title || `${body.algorithm} Analysis Report`, { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#666").text(`Generated ${new Date().toLocaleString()}`);
    if (dataset) {
      doc.text(`Dataset: ${dataset.originalName} (${dataset.rowCount} rows, ${dataset.columnCount} columns)`);
    }
    doc.fillColor("#000").moveDown(1);

    if (body.metrics && Object.keys(body.metrics).length > 0) {
      doc.fontSize(14).text("Summary Metrics", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(11);
      for (const [key, value] of Object.entries(body.metrics)) {
        doc.text(`${key}: ${value}`);
      }
      doc.moveDown(1);
    }

    if (body.sections) {
      for (const section of body.sections) {
        doc.fontSize(14).text(section.heading, { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(11).text(section.content, { align: "left" });
        doc.moveDown(1);
      }
    }

    if (body.table && body.table.rows.length > 0) {
      doc.fontSize(14).text("Data Preview", { underline: true });
      doc.moveDown(0.4);
      const { headers, rows } = body.table;
      const colWidth = (doc.page.width - 100) / headers.length;

      doc.fontSize(9).font("Helvetica-Bold");
      headers.forEach((h, i) => {
        doc.text(String(h), 50 + i * colWidth, doc.y, { width: colWidth, continued: false });
      });
      doc.font("Helvetica").moveDown(0.5);

      rows.slice(0, 30).forEach((row) => {
        const y = doc.y;
        row.forEach((cell, i) => {
          doc.text(String(cell), 50 + i * colWidth, y, { width: colWidth });
        });
        doc.moveDown(0.3);
      });

      if (rows.length > 30) {
        doc.moveDown(0.5).fontSize(9).fillColor("#666").text(`...and ${rows.length - 30} more rows`);
      }
    }

    doc.end();
    stream.on("finish", () => resolve(fileName));
    stream.on("error", reject);
  });
}

export async function createReport(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body as ReportRequestBody;
  if (!body?.datasetId || !body?.algorithm) {
    return res.status(400).json({ error: "datasetId and algorithm are required" });
  }

  const dataset = jsonStore.findOne<DatasetRecord>(
    DATASETS,
    (d) => d.id === body.datasetId && d.ownerId === req.user!.userId
  );

  let fileName: string;
  try {
    fileName = await renderReportPdf(body, dataset);
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate report PDF" });
  }

  const record: ReportRecord = {
    id: uuidv4(),
    ownerId: req.user.userId,
    datasetId: body.datasetId,
    title: body.title || `${body.algorithm} Analysis Report`,
    algorithm: body.algorithm,
    storedFileName: fileName,
    createdAt: new Date().toISOString(),
  };
  jsonStore.insert(REPORTS, record);

  return res.status(201).json(record);
}

export function listReports(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const reports = jsonStore.findMany<ReportRecord>(REPORTS, (r) => r.ownerId === req.user!.userId);
  return res.json(reports);
}

export function downloadReport(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const report = jsonStore.findOne<ReportRecord>(
    REPORTS,
    (r) => r.id === req.params.id && r.ownerId === req.user!.userId
  );
  if (!report) return res.status(404).json({ error: "Report not found" });

  const filePath = path.join(REPORTS_DIR, report.storedFileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File missing on disk" });

  return res.download(filePath, `${report.title}.pdf`);
}
