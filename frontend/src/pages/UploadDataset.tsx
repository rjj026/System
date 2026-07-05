import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, DatasetFile, DatasetQualityReport } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Trash2,
  ArrowRight,
  FileUp,
  Eye,
  HardDrive,
  Download,
  
  Copy,
  CircleSlash,
  AlertTriangle,
  Timer,
  Rows,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";

type ParsedRaw = { headers: string[]; rows: (string | number | null)[][] };

function parseCSV(text: string): ParsedRaw {
  const lines = text.replace(/\r/g, "").split("\n");
  // keep blank lines so we can detect them, drop only fully empty trailing
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length < 2) throw new Error("File must have a header row and at least one data row");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) =>
    line.split(",").map((v) => {
      const t = v.trim().replace(/^"|"$/g, "");
      if (t === "") return null;
      const n = parseFloat(t);
      return isNaN(n) ? t : n;
    })
  );
  return { headers, rows };
}

async function parseXLSX(file: File): Promise<ParsedRaw> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: null,
    blankrows: true,
  });
  if (!aoa.length) throw new Error("Empty sheet");
  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? "").trim());
  const rows = aoa.slice(1) as (string | number | null)[][];
  return { headers, rows };
}

/**
 * Cleans the raw parsed rows:
 *  - flags duplicate rows (exact match)
 *  - flags null/blank rows (rows where ALL cells are null/empty)
 *  - flags blank cells per row
 *  - keeps the cleaned numeric matrix used downstream (replacing remaining
 *    blank/non-numeric cells with 0 so PCA/LDA pipeline works)
 */
function analyzeAndClean(parsed: ParsedRaw): {
  cleanedNumeric: number[][];
  report: Omit<DatasetQualityReport, "runtimeMs">;
} {
  const { rows } = parsed;
  const colCount = parsed.headers.length;
  const rowsBefore = rows.length;

  let nullCells = 0;
  let blankCells = 0;
  const nullRows: number[] = [];
  const duplicateRows: number[] = [];
  const blankCellMap: Record<number, number[]> = {};

  // Detect blank/null cells & fully-null rows
  const seen = new Map<string, number>();
  const rowKept: boolean[] = new Array(rows.length).fill(true);

  rows.forEach((row, idx) => {
    let nullsInRow = 0;
    const blanksInThisRow: number[] = [];
    for (let j = 0; j < colCount; j++) {
      const v = row[j];
      const isBlank =
        v === null ||
        v === undefined ||
        (typeof v === "string" && v.trim() === "");
      if (isBlank) {
        nullCells++;
        blankCells++;
        nullsInRow++;
        blanksInThisRow.push(j);
      }
    }
    if (blanksInThisRow.length) blankCellMap[idx] = blanksInThisRow;

    // fully-null row
    if (nullsInRow === colCount) {
      nullRows.push(idx);
      rowKept[idx] = false;
      return;
    }

    // duplicate detection (string-key of normalized row)
    const key = row.map((v) => (v === null || v === undefined ? "" : String(v).trim())).join("|");
    if (seen.has(key)) {
      duplicateRows.push(idx);
      rowKept[idx] = false;
    } else {
      seen.set(key, idx);
    }
  });

  // Build cleaned numeric matrix (kept rows only, blanks->0, non-numeric->0)
  const cleanedNumeric: number[][] = [];
  rows.forEach((row, idx) => {
    if (!rowKept[idx]) return;
    const numericRow: number[] = [];
    for (let j = 0; j < colCount; j++) {
      const v = row[j];
      const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      numericRow.push(isNaN(n) ? 0 : n);
    }
    cleanedNumeric.push(numericRow);
  });

  return {
    cleanedNumeric,
    report: {
      rowsBefore,
      rowsAfter: cleanedNumeric.length,
      duplicates: duplicateRows.length,
      nullCells,
      blankCells,
      nullRows,
      duplicateRows,
      blankCellMap,
    },
  };
}

const UploadDataset = () => {
  const { datasets, addDataset, removeDataset, setCurrentStep } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewDataset, setPreviewDataset] = useState<DatasetFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);

  const ingestFile = async (file: File) => {
    setLoading(true);
    const start = performance.now();
    try {
      const ext = file.name.toLowerCase().split(".").pop() || "";
      let parsed: ParsedRaw;
      // Try XLSX-family first for known spreadsheet binaries, otherwise treat as
      // delimited text. As a last resort, fall back to XLSX which can also read
      // many tabular formats.
      const xlsxExts = ["xlsx", "xls", "xlsm", "xlsb", "ods"];
      const textExts = ["csv", "txt", "tsv", "psv", "dat", "log", "json"];
      try {
        if (xlsxExts.includes(ext)) {
          parsed = await parseXLSX(file);
        } else if (textExts.includes(ext) || ext === "") {
          const text = await file.text();
          parsed = parseCSV(text);
        } else {
          // Unknown extension — try text parse first, then xlsx
          try {
            const text = await file.text();
            parsed = parseCSV(text);
          } catch {
            parsed = await parseXLSX(file);
          }
        }
      } catch (innerErr) {
        // Final fallback attempt
        try {
          parsed = await parseXLSX(file);
        } catch {
          throw innerErr;
        }
      }

      const { cleanedNumeric, report } = analyzeAndClean(parsed);
      const runtimeMs = Math.round(performance.now() - start);

      const dataset: DatasetFile = {
        name: file.name,
        type: "dataset",
        data: cleanedNumeric,
        headers: parsed.headers,
        rows: cleanedNumeric.length,
        cols: parsed.headers.length,
        quality: { ...report, runtimeMs },
        rawPreview: parsed.rows.slice(0, 100).map((r) =>
          r.map((v) => (v === null || v === undefined ? "" : v))
        ) as (string | number)[][],
      };
      addDataset(dataset);
      toast.success(
        `${file.name}: ${report.rowsBefore} → ${cleanedNumeric.length} rows in ${runtimeMs}ms`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) ingestFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) ingestFile(file);
  };
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md">
              <Upload className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Upload Dataset</h1>
              <p className="text-sm text-muted-foreground">
                Upload any tabular file from any folder. We will scan it for duplicates,
                nulls and blanks before optimization.
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onFileChange}
        />

        {/* SINGLE FILE UPLOAD ZONE */}
        <Card
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "glass-card p-10 transition-all duration-300 animate-slide-up text-center border-2 border-dashed",
            dragOver ? "border-primary scale-[1.01] shadow-2xl bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg mb-4">
            <FileSpreadsheet className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">
            Drop a file here or browse
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            Accepts <span className="font-mono text-foreground">any file</span> from any folder —
            CSV, XLSX, TSV, TXT, JSON and more
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            <FileUp className="mr-2 h-4 w-4" />
            {loading ? "Analyzing…" : "Choose File"}
          </Button>
        </Card>

        {/* UPLOADED DATASETS + QUALITY REPORT */}
        {datasets.length > 0 && (
          <Card className="glass-card p-6 animate-scale-in">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Uploaded Datasets
                </h3>
              </div>
              <Badge variant="secondary">{datasets.length} file{datasets.length > 1 ? "s" : ""}</Badge>
            </div>

            <div className="space-y-4">
              {datasets.map((ds, i) => {
                const q = ds.quality;
                return (
                  <div key={i} className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{ds.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ds.cols} features
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewDataset(ds)} className="text-muted-foreground hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeDataset(i)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {q && (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-md bg-background/50 border border-border p-3">
                          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            <Rows className="h-3 w-3" /> Rows Before
                          </div>
                          <p className="text-lg font-bold text-foreground">{q.rowsBefore}</p>
                        </div>
                        <div className="rounded-md bg-success/5 border border-success/20 p-3">
                          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-success mb-1">
                            <Rows className="h-3 w-3" /> Rows After
                          </div>
                          <p className="text-lg font-bold text-success">{q.rowsAfter}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            −{q.rowsBefore - q.rowsAfter} cleaned
                          </p>
                        </div>
                        <div className={cn(
                          "rounded-md border p-3",
                          q.duplicates > 0 ? "bg-warning/5 border-warning/30" : "bg-background/50 border-border"
                        )}>
                          <div className={cn(
                            "flex items-center gap-1.5 text-xs uppercase tracking-wider mb-1",
                            q.duplicates > 0 ? "text-warning" : "text-muted-foreground"
                          )}>
                            <Copy className="h-3 w-3" /> Duplicates
                          </div>
                          <p className={cn("text-lg font-bold", q.duplicates > 0 ? "text-warning" : "text-foreground")}>
                            {q.duplicates}
                          </p>
                        </div>
                        <div className={cn(
                          "rounded-md border p-3",
                          q.nullCells > 0 ? "bg-destructive/5 border-destructive/30" : "bg-background/50 border-border"
                        )}>
                          <div className={cn(
                            "flex items-center gap-1.5 text-xs uppercase tracking-wider mb-1",
                            q.nullCells > 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            <CircleSlash className="h-3 w-3" /> Null / Blank Cells
                          </div>
                          <p className={cn("text-lg font-bold", q.nullCells > 0 ? "text-destructive" : "text-foreground")}>
                            {q.nullCells}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {q.nullRows.length} fully-empty rows
                          </p>
                        </div>
                        <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary mb-1">
                            <Timer className="h-3 w-3" /> Runtime
                          </div>
                          <p className="text-lg font-bold text-primary">{q.runtimeMs} ms</p>
                        </div>
                      </div>
                    )}

                    {q && (q.duplicates > 0 || q.nullCells > 0) && (
                      <div className="mt-3 flex items-start gap-2 rounded-md bg-warning/5 border border-warning/20 p-2.5">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          Issues detected and excluded from the cleaned dataset. Click <Eye className="inline h-3 w-3" /> to preview — duplicates highlighted in <span className="text-warning font-semibold">amber</span>, blanks in <span className="text-destructive font-semibold">red</span>.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="flex justify-end animate-fade-in">
          <Button
            onClick={() => { setCurrentStep(1); navigate("/dashboard/preprocess"); }}
            disabled={datasets.length === 0}
            className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl"
          >
            Proceed to Preprocessing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Data Preview Dialog with highlights */}
      <Dialog open={!!previewDataset} onOpenChange={() => setPreviewDataset(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Eye className="h-5 w-5 text-primary" />
              {previewDataset?.name}
              <Badge variant="secondary" className="ml-2">
                {previewDataset?.quality?.rowsBefore ?? previewDataset?.rows} raw rows × {previewDataset?.cols} cols
              </Badge>
              {!!previewDataset?.quality?.duplicates && (
                <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                  {previewDataset.quality.duplicates} duplicates
                </Badge>
              )}
              {!!previewDataset?.quality?.nullCells && (
                <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                  {previewDataset.quality.nullCells} blanks
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-warning/40 border border-warning" /> Duplicate row
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-destructive/40 border border-destructive" /> Blank / null cell
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted border border-border" /> Fully-empty row
            </span>
          </div>

          <div className="flex-1 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                  {previewDataset?.headers.map((h, j) => (
                    <th key={j} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewDataset?.rawPreview?.map((row, i) => {
                  const q = previewDataset.quality;
                  const isDup = q?.duplicateRows.includes(i);
                  const isNullRow = q?.nullRows.includes(i);
                  const blankCols = q?.blankCellMap[i] || [];
                  return (
                    <tr
                      key={i}
                      className={cn(
                        "border-t border-border/50 transition-colors",
                        isNullRow && "bg-muted/60",
                        isDup && !isNullRow && "bg-warning/10",
                        !isDup && !isNullRow && "hover:bg-muted/30"
                      )}
                    >
                      <td className="px-3 py-1.5 text-muted-foreground font-mono">
                        {i + 1}
                        {isDup && <Copy className="inline h-3 w-3 ml-1 text-warning" />}
                        {isNullRow && <CircleSlash className="inline h-3 w-3 ml-1 text-destructive" />}
                      </td>
                      {previewDataset.headers.map((_, j) => {
                        const v = row[j];
                        const isBlank = blankCols.includes(j);
                        return (
                          <td
                            key={j}
                            className={cn(
                              "px-3 py-1.5 font-mono whitespace-nowrap",
                              isBlank ? "bg-destructive/20 text-destructive font-semibold" : "text-foreground"
                            )}
                          >
                            {isBlank ? "—" : (typeof v === "number" ? v.toFixed(2) : String(v))}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(previewDataset?.quality?.rowsBefore || 0) > 100 && (
              <p className="p-3 text-center text-xs text-muted-foreground">
                Showing first 100 of {previewDataset?.quality?.rowsBefore} raw rows
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UploadDataset;
