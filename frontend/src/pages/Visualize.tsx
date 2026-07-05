import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Brain, TrendingUp, Target, Lightbulb, BarChart3, Eye, ShieldCheck, Info } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
} from "recharts";

const Visualize = () => {
  const { pcaResult, ldaResult, preprocessedData, datasets, setCurrentStep } = useApp();
  const navigate = useNavigate();

  // === Visualization Data ===
  const pcaScatter = pcaResult?.reducedData.map((p, i) => ({
    x: parseFloat(p[0].toFixed(3)),
    y: parseFloat((p[1] || 0).toFixed(3)),
    id: i,
  })) || [];

  const ldaScatter = ldaResult?.reducedData.map((p, i) => ({
    x: parseFloat(p[0].toFixed(3)),
    y: parseFloat((p[1] || 0).toFixed(3)),
    id: i,
  })) || [];

  // === Analysis Data ===
  const pcaChartData = pcaResult?.explainedVariance.map((v, i) => ({
    name: `PC${i + 1}`,
    variance: parseFloat(v.toFixed(1)),
  })) || [];

  const ldaChartData = ldaResult?.explainedVariance.map((v, i) => ({
    name: `LD${i + 1}`,
    variance: parseFloat(v.toFixed(1)),
  })) || [];

  const pcaTotalVar = pcaResult?.explainedVariance.reduce((a, b) => a + b, 0) || 0;
  const ldaTotalVar = ldaResult?.explainedVariance.reduce((a, b) => a + b, 0) || 0;
  const dominantPC = pcaResult?.explainedVariance[0] || 0;
  const dominantLD = ldaResult?.explainedVariance[0] || 0;
  const ldaAccuracy = ldaResult?.classAccuracy || 0;
  // PCA Accuracy = cumulative variance retained by the chosen components (reconstruction accuracy)
  const pcaAccuracy =
    pcaResult?.reconstructionAccuracy ??
    (pcaResult?.cumulativeVariance?.[(pcaResult?.cumulativeVariance.length || 1) - 1] || pcaTotalVar);

  const pcaComponents = pcaResult?.explainedVariance.length || 0;
  const ldaComponents = ldaResult?.explainedVariance.length || 0;
  const sampleSize = pcaResult?.reducedData.length || ldaResult?.reducedData.length || 0;
  const featureCount = datasets[0]?.cols || 0;

  // PCA spread (range of PC1)
  const pcaRange = pcaScatter.length
    ? Math.max(...pcaScatter.map(p => p.x)) - Math.min(...pcaScatter.map(p => p.x))
    : 0;
  const ldaRange = ldaScatter.length
    ? Math.max(...ldaScatter.map(p => p.x)) - Math.min(...ldaScatter.map(p => p.x))
    : 0;

  // === Interpretations ===
  const interpretations = [
    {
      icon: TrendingUp,
      title: "Variance Retention",
      summary: pcaTotalVar > 80
        ? `PCA retains ${pcaTotalVar.toFixed(1)}% of total variance — excellent preservation.`
        : pcaTotalVar > 50
        ? `PCA retains ${pcaTotalVar.toFixed(1)}% — moderate retention.`
        : `PCA retains only ${pcaTotalVar.toFixed(1)}% — low retention detected.`,
      detail: `Variance retention measures how much of the original dataset's information is preserved after dimensionality reduction. PCA transforms high-dimensional data into a smaller set of uncorrelated components ranked by the amount of variance they capture. A retention above 80% means the reduced representation closely mirrors the original data structure with minimal information loss. Between 50–80%, some patterns may be diluted — consider retaining additional principal components. Below 50%, the data has high intrinsic dimensionality. The current cumulative explained variance across all retained components is ${pcaTotalVar.toFixed(2)}%.`,
      status: pcaTotalVar > 80 ? "success" : pcaTotalVar > 50 ? "warning" : "critical",
    },
    {
      icon: ShieldCheck,
      title: "PCA Accuracy (Reconstruction)",
      summary: pcaAccuracy > 80
        ? `${pcaAccuracy.toFixed(1)}% reconstruction accuracy — high-fidelity projection.`
        : pcaAccuracy > 60
        ? `${pcaAccuracy.toFixed(1)}% reconstruction accuracy — acceptable fidelity.`
        : `${pcaAccuracy.toFixed(1)}% reconstruction accuracy — significant loss.`,
      detail: `PCA accuracy is measured as reconstruction accuracy — the cumulative percentage of variance recovered when the data is rebuilt from the selected principal components. A value of ${pcaAccuracy.toFixed(2)}% means that ${pcaAccuracy.toFixed(2)}% of the original information can be recovered from the reduced ${pcaComponents}-dimensional representation, while ${(100 - pcaAccuracy).toFixed(2)}% is lost. Above 80% indicates the projection is a faithful summary of the data; between 60–80% is acceptable for exploration but may hide subtle patterns; below 60% indicates the original data is too complex to be represented in only ${pcaComponents} components.`,
      status: pcaAccuracy > 80 ? "success" : pcaAccuracy > 60 ? "warning" : "critical",
    },
    {
      icon: Target,
      title: "Class Separability (LDA)",
      summary: ldaAccuracy > 85
        ? `${ldaAccuracy.toFixed(1)}% accuracy — strong class separation.`
        : ldaAccuracy > 70
        ? `${ldaAccuracy.toFixed(1)}% accuracy — moderate separability.`
        : `${ldaAccuracy.toFixed(1)}% accuracy — weak class boundaries.`,
      detail: `Class separability quantifies how well LDA can distinguish between predefined classes. Unlike PCA which is unsupervised, LDA uses class labels to find linear combinations of features that maximize the ratio of between-class variance to within-class variance. An accuracy above 85% indicates clear, well-separated clusters. Between 70–85%, there is partial overlap between classes. Below 70%, the classes are poorly separated. Current LDA classification accuracy stands at ${ldaAccuracy.toFixed(2)}%.`,
      status: ldaAccuracy > 85 ? "success" : ldaAccuracy > 70 ? "warning" : "critical",
    },
    {
      icon: BarChart3,
      title: "Dominant Component",
      summary: dominantPC > 50
        ? `PC1 explains ${dominantPC.toFixed(1)}% — a single dominant trend drives the data.`
        : `PC1 explains ${dominantPC.toFixed(1)}% — variance is distributed across components.`,
      detail: `The dominant component analysis examines how much variance the first principal component (PC1) captures relative to the total. When PC1 explains more than 50%, it indicates a single strong underlying pattern governs the data. When PC1 explains less than 50%, the data exhibits multidimensional complexity with several independent factors contributing roughly equally. PC1 currently accounts for ${dominantPC.toFixed(2)}% of the total explained variance, ${dominantPC > 50 ? "confirming a strong primary axis of variation" : "suggesting the data's complexity requires multi-component interpretation"}.`,
      status: dominantPC > 50 ? "success" : "warning",
    },
    {
      icon: Lightbulb,
      title: "Algorithm Recommendation",
      summary: pcaTotalVar > ldaTotalVar && ldaAccuracy < 80
        ? "PCA is better suited for this dataset."
        : ldaAccuracy > 85
        ? "LDA outperforms PCA for classification."
        : "Both algorithms complement each other.",
      detail: pcaTotalVar > ldaTotalVar && ldaAccuracy < 80
        ? `Based on the analysis results, PCA is the recommended algorithm for this dataset. PCA achieved ${pcaTotalVar.toFixed(1)}% variance retention with ${pcaAccuracy.toFixed(1)}% reconstruction accuracy, while LDA's classification accuracy is ${ldaAccuracy.toFixed(1)}%, which falls below the 80% threshold for reliable class separation.`
        : ldaAccuracy > 85
        ? `LDA is the recommended algorithm, achieving ${ldaAccuracy.toFixed(1)}% classification accuracy — significantly above the 85% threshold for strong separability. LDA's supervised approach leverages class labels to find optimal discriminant directions.`
        : `Both PCA and LDA provide complementary insights. PCA captures ${pcaTotalVar.toFixed(1)}% of total variance through unsupervised decomposition (${pcaAccuracy.toFixed(1)}% reconstruction accuracy). LDA achieves ${ldaAccuracy.toFixed(1)}% classification accuracy. Use PCA for exploration and LDA for classification tasks.`,
      status: "success",
    },
  ];

  const dataQualityDetail = preprocessedData
    ? `Data quality preprocessing directly impacts reliability. ${preprocessedData.missingValuesHandled} missing values were imputed, ${preprocessedData.outliersRemoved} outliers corrected, and ${preprocessedData.scalingMethod} scaling was applied to normalize features — essential because PCA and LDA are sensitive to feature magnitude.`
    : null;

  const statusStyles = {
    success: { border: "border-l-green-500", badge: "bg-green-500/10 text-green-600", label: "Good" },
    warning: { border: "border-l-yellow-500", badge: "bg-yellow-500/10 text-yellow-600", label: "Moderate" },
    critical: { border: "border-l-red-500", badge: "bg-red-500/10 text-red-600", label: "Needs Attention" },
  };

  // === Comparison Summary rows (detailed) ===
  const comparisonRows: { metric: string; pca: string; lda: string; note?: string }[] = [
    {
      metric: "Algorithm Type",
      pca: "Unsupervised",
      lda: "Supervised",
      note: "PCA ignores class labels; LDA uses them to maximize class separation.",
    },
    {
      metric: "Components Extracted",
      pca: `${pcaComponents}`,
      lda: `${ldaComponents}`,
      note: "Number of new axes (dimensions) produced by each algorithm.",
    },
    {
      metric: "Total Variance Explained",
      pca: `${pcaTotalVar.toFixed(2)}%`,
      lda: `${ldaTotalVar.toFixed(2)}%`,
      note: "Sum of variance captured across all retained components.",
    },
    {
      metric: "Dominant Component (1st axis)",
      pca: `${dominantPC.toFixed(2)}%`,
      lda: `${dominantLD.toFixed(2)}%`,
      note: "Variance carried by the strongest single component.",
    },
    {
      metric: "Reconstruction / PCA Accuracy",
      pca: `${pcaAccuracy.toFixed(2)}%`,
      lda: "—",
      note: "How much of the original data PCA can rebuild from the chosen components.",
    },
    {
      metric: "Class Accuracy",
      pca: "—",
      lda: `${ldaAccuracy.toFixed(2)}%`,
      note: "How accurately LDA separates predefined classes.",
    },
    {
      metric: "Projection Spread (1st axis range)",
      pca: pcaRange.toFixed(2),
      lda: ldaRange.toFixed(2),
      note: "Spread of points along the first axis — wider = better separation.",
    },
    {
      metric: "Sample Size",
      pca: `${sampleSize}`,
      lda: `${sampleSize}`,
      note: "Number of records projected into 2D space.",
    },
    {
      metric: "Original Features",
      pca: `${featureCount}`,
      lda: `${featureCount}`,
      note: "Original dimensions before reduction.",
    },
    {
      metric: "Best Use Case",
      pca: "Exploration & noise reduction",
      lda: "Classification & class separation",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md">
              <Eye className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Visualize & Analysis</h1>
              <p className="text-sm text-muted-foreground">2D scatter plots, variance analysis, and detailed interpretation.</p>
            </div>
          </div>
        </div>

        {/* ============ SECTION 1: DATA INTERPRETATION (TOP) ============ */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Data Interpretation</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="glass-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Datasets</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{datasets.length}</p>
            </Card>
            <Card className="glass-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">PCA Variance</p>
              <p className="mt-1 text-2xl font-bold text-primary">{pcaTotalVar.toFixed(1)}%</p>
            </Card>
            <Card className="glass-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">PCA Accuracy</p>
              <p className="mt-1 text-2xl font-bold text-primary">{pcaAccuracy.toFixed(1)}%</p>
            </Card>
            <Card className="glass-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">LDA Accuracy</p>
              <p className="mt-1 text-2xl font-bold text-accent">{ldaAccuracy.toFixed(1)}%</p>
            </Card>
          </div>

          <div className="space-y-4">
            {interpretations.map((item) => {
              const style = statusStyles[item.status as keyof typeof statusStyles];
              return (
                <Card key={item.title} className={`glass-card border-l-4 p-5 ${style.border}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <item.icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display text-sm font-semibold text-foreground">{item.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground/80 mb-2">{item.summary}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                </Card>
              );
            })}

            {preprocessedData && (
              <Card className="glass-card border-l-4 border-l-blue-500 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <ShieldCheck className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-sm font-semibold text-foreground">Data Quality Note</h3>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-600">
                        Preprocessed
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground/80 mb-2">
                      {preprocessedData.missingValuesHandled} missing values imputed, {preprocessedData.outliersRemoved} outliers corrected using {preprocessedData.scalingMethod}.
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{dataQualityDetail}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* ============ SECTION 2: DATA VISUALIZATION ============ */}
        <div className="border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" /> Data Visualization
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-card p-6 animate-slide-up stagger-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">PCA — 2D Projection</h3>
              </div>
              <div className="mb-4 rounded-md bg-muted/40 p-3 border-l-2 border-primary/60">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    The PCA 2D Projection plots each
                    record onto the two strongest principal components (PC1 horizontal, PC2 vertical) — the directions
                    that capture the most variance. Points that are close together share similar feature patterns;
                    points that are far apart are most different. This view reveals natural clusters, outliers, and
                    the overall shape of the data <span className="font-medium text-foreground">without</span> using
                    any class labels.
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="x" name="PC1" type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="y" name="PC2" type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Legend />
                  <Scatter name="PCA Points" data={pcaScatter} fill="hsl(var(--primary))" r={6} />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>

            <Card className="glass-card p-6 animate-slide-up stagger-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-accent" />
                <h3 className="font-display text-lg font-semibold text-foreground">LDA — 2D Projection</h3>
              </div>
              <div className="mb-4 rounded-md bg-muted/40 p-3 border-l-2 border-accent/60">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    The LDA 2D Projection plots each
                    record onto the two strongest discriminant axes (LD1 horizontal, LD2 vertical) — directions
                    chosen to <span className="font-medium text-foreground">maximize separation between classes</span>
                    {" "}and minimize variation within each class. Tight, well-separated groups indicate the features
                    distinguish the classes effectively; overlapping points indicate weak class boundaries.
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="x" name="LD1" type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="y" name="LD2" type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Legend />
                  <Scatter name="LDA Points" data={ldaScatter} fill="hsl(var(--accent))" r={6} />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>

        {/* ============ SECTION 3: PCA & LDA ANALYSIS ============ */}
        <div className="border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> PCA & LDA Analysis
          </h2>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6 animate-slide-up stagger-3">
            <Card className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">PCA Total Variance</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{pcaTotalVar.toFixed(1)}%</p>
            </Card>
            <Card className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">PCA Accuracy</span>
              </div>
              <p className="text-3xl font-bold text-primary">{pcaAccuracy.toFixed(1)}%</p>
            </Card>
            <Card className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">LDA Total Variance</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{ldaTotalVar.toFixed(1)}%</p>
            </Card>
            <Card className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">LDA Accuracy</span>
              </div>
              <p className="text-3xl font-bold text-green-500">{ldaAccuracy.toFixed(1)}%</p>
            </Card>
          </div>

          {/* Variance Bar Charts */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card className="glass-card p-6 animate-slide-up stagger-4">
              <h3 className="mb-4 font-display text-lg font-semibold text-foreground">PCA Explained Variance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pcaChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="variance" radius={[6, 6, 0, 0]}>
                    {pcaChartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.5)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="glass-card p-6 animate-slide-up stagger-4">
              <h3 className="mb-4 font-display text-lg font-semibold text-foreground">LDA Explained Variance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ldaChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="variance" radius={[6, 6, 0, 0]}>
                    {ldaChartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "hsl(var(--accent))" : "hsl(var(--accent) / 0.5)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Detailed Comparison Table */}
          <Card className="glass-card p-6 animate-slide-up stagger-5 mb-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg font-semibold text-foreground">Detailed Comparison Summary</h3>
              <span className="text-xs text-muted-foreground">PCA vs LDA — full metric breakdown</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Side-by-side comparison of every metric produced by both algorithms, including components, total
              variance, dominant axis, PCA reconstruction accuracy, LDA class accuracy, and projection spread.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Metric</th>
                    <th className="px-4 py-3 text-right font-semibold text-primary">PCA</th>
                    <th className="px-4 py-3 text-right font-semibold text-accent">LDA</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.metric} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{row.metric}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">{row.pca}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">{row.lda}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard/algorithms")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={() => { setCurrentStep(4); navigate("/dashboard/report"); }}
            className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            Generate Report <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Visualize;
