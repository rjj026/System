import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Settings, Sparkles, Shield, BarChart3,
  AlertTriangle, Database, Info, Gauge, Table as TableIcon, Columns2, Rows3,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { preprocessData } from "@/lib/algorithms";

const preprocessSteps = [
  { label: "Missing Value Imputation", desc: "Fill gaps with mean/median values", icon: Sparkles },
  { label: "Outlier Detection", desc: "Identify & correct anomalous data points", icon: Shield },
  { label: "Z-Score Normalization", desc: "Standardize features to unit variance", icon: BarChart3 },
];

// Dataset quality review (pre-optimization)
function reviewDataset(rows: number[][]) {
  if (!rows.length) {
    return { totalCells: 0, missing: 0, outliers: 0, scaleVariance: 0, qualityScore: 0 };
  }
  const cols = Math.max(...rows.map((r) => r.length));
  let missing = 0;
  let outliers = 0;
  const colStats: { mean: number; std: number; min: number; max: number }[] = [];

  for (let j = 0; j < cols; j++) {
    const vals: number[] = [];
    for (const r of rows) {
      const v = r[j];
      if (v === undefined || v === null || isNaN(v as number)) missing++;
      else vals.push(v);
    }
    const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length || 1);
    const std = Math.sqrt(variance) || 1;
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 0);
    colStats.push({ mean, std, min, max });
    for (const v of vals) {
      if (Math.abs((v - mean) / std) > 3) outliers++;
    }
  }

  // Scale disparity: ratio of largest to smallest std (high = features on very different scales)
  const stds = colStats.map((c) => c.std);
  const scaleVariance = Math.max(...stds) / (Math.min(...stds) || 1);

  const totalCells = rows.length * cols;
  const missingPct = (missing / totalCells) * 100;
  const outlierPct = (outliers / totalCells) * 100;
  // simple quality score 0-100
  const qualityScore = Math.max(
    0,
    100 - missingPct * 2 - outlierPct * 1.5 - Math.min(30, Math.log10(scaleVariance + 1) * 10)
  );

  return { totalCells, missing, outliers, scaleVariance, qualityScore, colStats };
}

const Preprocess = () => {
  const { datasets, preprocessedData, setPreprocessedData, setCurrentStep } = useApp();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Combined dataset for review
  const combinedRaw = useMemo(() => {
    const allData = datasets.flatMap((d) => d.data);
    if (!allData.length) return [];
    const maxCols = Math.max(...datasets.map((d) => d.cols));
    return allData.map((row) => {
      const r = [...row];
      while (r.length < maxCols) r.push(0);
      return r.slice(0, maxCols);
    });
  }, [datasets]);

  const review = useMemo(() => reviewDataset(combinedRaw), [combinedRaw]);
  const featureCount = combinedRaw[0]?.length || 0;

  // Real headers from the first dataset (padded/truncated to feature count)
  const realHeaders = useMemo(() => {
    const hs = datasets[0]?.headers ?? [];
    return Array.from({ length: featureCount }).map((_, j) => hs[j] || `F${j + 1}`);
  }, [datasets, featureCount]);

  const [showAllRawRows, setShowAllRawRows] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [compareMode, setCompareMode] = useState<"processed" | "sideBySide" | "interleaved">("processed");
  const [timing, setTiming] = useState<{ start: Date; end: Date; ms: number } | null>(null);

  const handlePreprocess = async () => {
    setProcessing(true);
    setProgress(0);

    // Animated progress (UX only — not counted in runtime)
    for (let i = 1; i <= 3; i++) {
      await new Promise((r) => setTimeout(r, 500));
      setProgress(Math.round((i / 3) * 100));
    }

    // Measure ONLY the real preprocessing computation
    const startDate = new Date();
    const t0 = performance.now();
    const result = preprocessData(combinedRaw);
    const t1 = performance.now();
    const endDate = new Date();

    setPreprocessedData(result);
    setTiming({ start: startDate, end: endDate, ms: t1 - t0 });
    setProcessing(false);
    setCompareMode("sideBySide");
  };

  const qualityLabel =
    review.qualityScore >= 80 ? { label: "Good", color: "text-success", bg: "bg-success/10" } :
    review.qualityScore >= 60 ? { label: "Moderate", color: "text-warning", bg: "bg-warning/10" } :
    { label: "Needs Optimization", color: "text-destructive", bg: "bg-destructive/10" };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Preprocess Data</h1>
              <p className="text-sm text-muted-foreground">Review, optimize, and prepare data for dimensionality reduction.</p>
            </div>
          </div>
        </div>

        {/* ============ SECTION 1: DATASET REVIEW ============ */}
        {datasets.length > 0 && (
          <div className="animate-slide-up">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> Dataset Review
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Rows</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{combinedRaw.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{featureCount} features</p>
              </Card>
              <Card className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Missing Values</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{review.missing}</p>
                <p className="text-xs text-muted-foreground mt-1">{((review.missing / (review.totalCells || 1)) * 100).toFixed(2)}% of cells</p>
              </Card>
              <Card className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Outliers (|z|&gt;3)</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{review.outliers}</p>
                <p className="text-xs text-muted-foreground mt-1">{((review.outliers / (review.totalCells || 1)) * 100).toFixed(2)}% of cells</p>
              </Card>
              <Card className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quality Score</span>
                </div>
                <p className={`text-2xl font-bold ${qualityLabel.color}`}>{review.qualityScore.toFixed(0)}/100</p>
                <Badge variant="secondary" className={`mt-1 ${qualityLabel.bg} ${qualityLabel.color} border-0`}>
                  {qualityLabel.label}
                </Badge>
              </Card>
            </div>

            {/* Why optimize */}
            <Card className="glass-card border-l-4 border-l-primary p-5 mt-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Why Optimize This Dataset?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    PCA and LDA are <strong className="text-foreground">scale-sensitive</strong> and
                    <strong className="text-foreground"> assume clean numeric input</strong>. Without preprocessing, features
                    measured on larger scales (e.g. revenue in millions) would dominate components, missing values would
                    distort covariance, and extreme outliers could bias the projection axes.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
                    <li className="flex gap-2"><Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span><strong className="text-foreground">Imputation</strong> ({review.missing} gaps) prevents NaN propagation through the covariance matrix.</span></li>
                    <li className="flex gap-2"><Shield className="h-4 w-4 text-accent shrink-0 mt-0.5" /> <span><strong className="text-foreground">Outlier correction</strong> ({review.outliers} extreme points) avoids skewed eigenvectors.</span></li>
                    <li className="flex gap-2"><BarChart3 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span><strong className="text-foreground">Z-score scaling</strong> equalizes feature ranges (current scale disparity: ×{review.scaleVariance.toFixed(1)}), so each variable contributes fairly.</span></li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ============ SECTION 1.5: ORIGINAL DATASET PREVIEW (always visible once uploaded) ============ */}
        {datasets.length > 0 && (
          <Card className="glass-card p-6 animate-slide-up">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-display text-lg font-semibold text-foreground">Original Dataset Preview</h3>
              </div>
              <Badge variant="outline">
                {combinedRaw.length} rows × {featureCount} features (before processing)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Raw values exactly as uploaded — before imputation, outlier correction, or normalization.
            </p>
            <div className="overflow-auto rounded-lg border border-border max-h-[24rem]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                    {realHeaders.map((h, j) => (
                      <th key={j} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(showAllRawRows ? combinedRaw : combinedRaw.slice(0, 10)).map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                      {row.map((v, j) => (
                        <td key={j} className="px-3 py-1.5 font-mono text-foreground">
                          {v === undefined || v === null || isNaN(v as number) ? (
                            <span className="text-destructive">missing</span>
                          ) : (
                            Number(v).toFixed(2)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {combinedRaw.length > 10 && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {showAllRawRows
                    ? `Showing all ${combinedRaw.length} original rows`
                    : `Showing first 10 of ${combinedRaw.length} original rows`}
                </p>
                <Button size="sm" variant="outline" onClick={() => setShowAllRawRows((v) => !v)}>
                  {showAllRawRows ? "Show first 10" : "Show all rows"}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* ============ SECTION 2: PIPELINE STEPS ============ */}
        <div className="grid gap-4 md:grid-cols-3">
          {preprocessSteps.map((step, i) => {
            const done = preprocessedData !== null;
            const active = processing && progress >= Math.round(((i + 1) / 3) * 100);
            return (
              <Card key={i} className={`glass-card p-5 transition-all duration-300 animate-slide-up stagger-${i + 1}`}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    done ? "bg-success/10" : active ? "gradient-primary" : "bg-muted"
                  )}>
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <step.icon className={cn("h-4 w-4", active ? "text-primary-foreground" : "text-muted-foreground")} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{step.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {!preprocessedData ? (
          <Card className="glass-card p-8 text-center animate-scale-in">
            {processing ? (
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-xl gradient-primary flex items-center justify-center animate-pulse-gentle">
                  <Settings className="h-6 w-6 text-primary-foreground animate-spin" />
                </div>
                <p className="text-sm font-medium text-foreground">Optimizing {combinedRaw.length} data points...</p>
                <Progress value={progress} className="h-2 mx-auto max-w-xs" />
                <p className="text-xs text-muted-foreground">{progress}% complete</p>
              </div>
            ) : (
              <>
                <Settings className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-foreground font-medium">Ready to optimize</p>
                <p className="mb-6 text-sm text-muted-foreground">
                  {datasets.length} dataset(s) with {combinedRaw.length} total rows ready.
                </p>
                <Button onClick={handlePreprocess} disabled={!datasets.length} className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20">
                  Start Optimization
                </Button>
              </>
            )}
          </Card>
        ) : (
          <>
            {/* ============ SECTION 3: OPTIMIZATION RESULTS ============ */}
            <Card className="glass-card p-6 animate-scale-in">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h3 className="font-display text-lg font-semibold text-foreground">Optimization Complete</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { value: preprocessedData.missingValuesHandled, label: "Missing Values Handled", color: "text-primary" },
                  { value: preprocessedData.outliersRemoved, label: "Outliers Corrected", color: "text-accent" },
                  { value: preprocessedData.scalingMethod, label: "Scaling Method", color: "text-foreground" },
                ].map((stat, i) => (
                  <div key={i} className={`rounded-lg bg-muted/50 p-4 animate-slide-up stagger-${i + 1}`}>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Reduction & Runtime Summary */}
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Rows Before → After</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {combinedRaw.length} <span className="text-muted-foreground">→</span> {preprocessedData.normalized.length}
                  </p>
                  <p className="text-xs text-accent mt-1">
                    Reduced by {Math.max(0, combinedRaw.length - preprocessedData.normalized.length)} rows
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Cells Cleaned</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {preprocessedData.missingValuesHandled + preprocessedData.outliersRemoved}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {preprocessedData.missingValuesHandled} missing + {preprocessedData.outliersRemoved} outliers
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Runtime</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    {timing ? `${timing.ms.toFixed(3)} ms` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timing ? `${(timing.ms / 1000).toFixed(4)} seconds (real compute time)` : "Awaiting run"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Start → End Time</p>
                  <p className="text-xs font-mono font-semibold text-foreground mt-1">
                    Start: {timing ? `${timing.start.toLocaleTimeString()}.${String(timing.start.getMilliseconds()).padStart(3, "0")}` : "—"}
                  </p>
                  <p className="text-xs font-mono font-semibold text-foreground">
                    End:&nbsp;&nbsp; {timing ? `${timing.end.toLocaleTimeString()}.${String(timing.end.getMilliseconds()).padStart(3, "0")}` : "—"}
                  </p>
                </div>
              </div>
            </Card>

            {/* ============ SECTION 4: ORIGINAL vs PROCESSED COMPARISON ============ */}
            <Card className="glass-card p-6 animate-scale-in">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <TableIcon className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-foreground">Original vs. Processed Comparison</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {preprocessedData.normalized.length} rows × {preprocessedData.normalized[0]?.length || 0} features
                  </Badge>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <Button
                      size="sm"
                      variant={compareMode === "processed" ? "default" : "ghost"}
                      className="rounded-none"
                      onClick={() => setCompareMode("processed")}
                    >
                      Processed Only
                    </Button>
                    <Button
                      size="sm"
                      variant={compareMode === "sideBySide" ? "default" : "ghost"}
                      className="rounded-none"
                      onClick={() => setCompareMode("sideBySide")}
                    >
                      <Columns2 className="mr-1.5 h-3.5 w-3.5" /> Side by Side
                    </Button>
                    <Button
                      size="sm"
                      variant={compareMode === "interleaved" ? "default" : "ghost"}
                      className="rounded-none"
                      onClick={() => setCompareMode("interleaved")}
                    >
                      <Rows3 className="mr-1.5 h-3.5 w-3.5" /> Interleaved
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Real Z-score normalized values computed from your uploaded dataset (mean ≈ 0, std ≈ 1).
                Highlighted cells (|z| &gt; 1.5) indicate strong deviations from the feature mean.
                {compareMode !== "processed" && " Original raw values are shown alongside the processed values below."}
              </p>

              {compareMode === "sideBySide" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Original column */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">Original</Badge>
                      <span className="text-xs text-muted-foreground">Before processing</span>
                    </div>
                    <div className="overflow-auto rounded-lg border border-border max-h-[28rem]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted z-10">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                            {realHeaders.map((h, j) => (
                              <th key={j} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(showAllRows ? combinedRaw : combinedRaw.slice(0, 20)).map((row, i) => (
                            <tr key={i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                              {row.map((v, j) => (
                                <td key={j} className="px-3 py-1.5 font-mono text-muted-foreground">
                                  {v === undefined || v === null || isNaN(v as number) ? (
                                    <span className="text-destructive">missing</span>
                                  ) : (
                                    Number(v).toFixed(2)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Processed column */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0">Processed</Badge>
                      <span className="text-xs text-muted-foreground">After imputation, outlier correction & scaling</span>
                    </div>
                    <div className="overflow-auto rounded-lg border border-border max-h-[28rem]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted z-10">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                            {realHeaders.map((h, j) => (
                              <th key={j} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(showAllRows ? preprocessedData.normalized : preprocessedData.normalized.slice(0, 20)).map((row, i) => (
                            <tr key={i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                              {row.map((v, j) => (
                                <td key={j} className={cn(
                                  "px-3 py-1.5 font-mono",
                                  Math.abs(v) > 1.5 ? "text-accent font-semibold" : "text-foreground"
                                )}>
                                  {Number.isFinite(v) ? v.toFixed(4) : "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {compareMode === "interleaved" && (
                <div className="overflow-auto rounded-lg border border-border max-h-[32rem]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted z-10">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                        {realHeaders.map((h, j) => (
                          <th key={j} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllRows ? preprocessedData.normalized : preprocessedData.normalized.slice(0, 20)).map((row, i) => (
                        <>
                          <tr key={`opt-${i}`} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-1.5 text-muted-foreground" rowSpan={2}>{i + 1}</td>
                            <td className="px-3 py-1.5">
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px]">OPT</Badge>
                            </td>
                            {row.map((v, j) => (
                              <td key={j} className={cn(
                                "px-3 py-1.5 font-mono",
                                Math.abs(v) > 1.5 ? "text-accent font-semibold" : "text-foreground"
                              )}>
                                {Number.isFinite(v) ? v.toFixed(4) : "—"}
                              </td>
                            ))}
                          </tr>
                          <tr key={`raw-${i}`} className="border-b border-border/50 bg-muted/20">
                            <td className="px-3 py-1.5">
                              <Badge variant="outline" className="text-[10px]">RAW</Badge>
                            </td>
                            {(combinedRaw[i] || []).map((v, j) => (
                              <td key={j} className="px-3 py-1.5 font-mono text-muted-foreground">
                                {Number.isFinite(v) ? Number(v).toFixed(2) : "—"}
                              </td>
                            ))}
                          </tr>
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {compareMode === "processed" && (
                <div className="overflow-auto rounded-lg border border-border max-h-[32rem]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted z-10">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                        {realHeaders.map((h, j) => (
                          <th key={j} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllRows ? preprocessedData.normalized : preprocessedData.normalized.slice(0, 20)).map((row, i) => (
                        <tr key={i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          {row.map((v, j) => (
                            <td key={j} className={cn(
                              "px-3 py-1.5 font-mono",
                              Math.abs(v) > 1.5 ? "text-accent font-semibold" : "text-foreground"
                            )}>
                              {Number.isFinite(v) ? v.toFixed(4) : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {preprocessedData.normalized.length > 20 && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {showAllRows
                      ? `Showing all ${preprocessedData.normalized.length} rows`
                      : `Showing first 20 of ${preprocessedData.normalized.length} rows`}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setShowAllRows((v) => !v)}>
                    {showAllRows ? "Show first 20" : "Show all rows"}
                  </Button>
                </div>
              )}
            </Card>
          </>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={() => { setCurrentStep(2); navigate("/dashboard/algorithms"); }}
            disabled={!preprocessedData}
            className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            Apply Algorithms <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default Preprocess;
