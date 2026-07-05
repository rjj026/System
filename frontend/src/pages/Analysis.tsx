import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Eye, TrendingUp, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const Analysis = () => {
  const { pcaResult, ldaResult, setCurrentStep } = useApp();
  const navigate = useNavigate();

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md">
              <Eye className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analysis — PCA & LDA Results</h1>
              <p className="text-sm text-muted-foreground">Compare results from both algorithms.</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3 animate-slide-up stagger-1">
          <Card className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">PCA Total Variance</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{pcaTotalVar.toFixed(1)}%</p>
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
              <Target className="h-4 w-4 text-success" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">LDA Accuracy</span>
            </div>
            <p className="text-3xl font-bold text-success">{(ldaResult?.classAccuracy || 0).toFixed(1)}%</p>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-card p-6 animate-slide-up stagger-2">
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

          <Card className="glass-card p-6 animate-slide-up stagger-3">
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

        {/* Comparison Table */}
        <Card className="glass-card p-6 animate-slide-up stagger-4">
          <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Comparison Summary</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Metric</th>
                  <th className="px-4 py-3 text-right font-semibold text-primary">PCA</th>
                  <th className="px-4 py-3 text-right font-semibold text-accent">LDA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">Components</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{pcaResult?.explainedVariance.length || 0}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{ldaResult?.explainedVariance.length || 0}</td>
                </tr>
                <tr className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">Total Variance</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{pcaTotalVar.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{ldaTotalVar.toFixed(1)}%</td>
                </tr>
                {ldaResult && (
                  <tr className="border-t border-border/50">
                    <td className="px-4 py-3 font-medium text-foreground">Class Accuracy</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-success">{ldaResult.classAccuracy.toFixed(1)}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard/algorithms")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={() => { setCurrentStep(4); navigate("/dashboard/visualize"); }}
            className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            Visualize Data <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analysis;
