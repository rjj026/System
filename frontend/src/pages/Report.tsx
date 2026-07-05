import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, FileText, CheckCircle2, Sparkles } from "lucide-react";

const Report = () => {
  const { pcaResult, ldaResult, analysisReport, setAnalysisReport, setCurrentStep } = useApp();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));

    const pcaVar = pcaResult?.explainedVariance.reduce((a, b) => a + b, 0) || 0;
    const ldaVar = ldaResult?.explainedVariance.reduce((a, b) => a + b, 0) || 0;

    setAnalysisReport({
      pcaSummary: `PCA reduced the dataset to ${pcaResult?.explainedVariance.length || 0} principal components, capturing ${pcaVar.toFixed(1)}% of total variance. The first component alone explains ${(pcaResult?.explainedVariance[0] || 0).toFixed(1)}% of variance, indicating a strong primary axis of variation in the data.`,
      ldaSummary: `LDA achieved ${(ldaResult?.classAccuracy || 0).toFixed(1)}% classification accuracy with ${ldaResult?.explainedVariance.length || 0} discriminant components capturing ${ldaVar.toFixed(1)}% of between-class variance. The model demonstrates effective class separation.`,
      recommendation: pcaVar > ldaVar
        ? "PCA is recommended for this dataset as it captures more variance with fewer components. Use PCA for exploratory analysis and visualization."
        : "LDA is recommended as it provides better class separation. Use LDA when classification accuracy is the primary goal.",
      timestamp: new Date().toISOString(),
    });
    setGenerating(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Generate Analysis Report</h1>
              <p className="text-sm text-muted-foreground">Comprehensive report comparing PCA and LDA results.</p>
            </div>
          </div>
        </div>

        {!analysisReport ? (
          <Card className="glass-card p-10 text-center animate-scale-in">
            {generating ? (
              <div className="space-y-4">
                <div className="mx-auto h-14 w-14 rounded-xl gradient-primary flex items-center justify-center animate-pulse-gentle">
                  <Sparkles className="h-7 w-7 text-primary-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Generating comprehensive report...</p>
                <p className="text-xs text-muted-foreground">Analyzing PCA and LDA results</p>
              </div>
            ) : (
              <>
                <FileText className="mx-auto mb-4 h-14 w-14 text-muted-foreground/50" />
                <p className="mb-2 text-foreground font-semibold">Ready to generate report</p>
                <p className="mb-6 text-sm text-muted-foreground max-w-md mx-auto">
                  Create a detailed analysis report summarizing PCA and LDA findings with recommendations.
                </p>
                <Button onClick={handleGenerate} className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Sparkles className="mr-2 h-4 w-4" /> Generate Report
                </Button>
              </>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="glass-card p-5 border-success/20 animate-scale-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <h3 className="font-display text-sm font-semibold text-foreground">Report Generated Successfully</h3>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(analysisReport.timestamp).toLocaleString()}</span>
              </div>
            </Card>

            <Card className="glass-card p-6 animate-slide-up stagger-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h4 className="font-display text-sm font-semibold text-foreground">PCA Summary</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysisReport.pcaSummary}</p>
            </Card>

            <Card className="glass-card p-6 animate-slide-up stagger-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <h4 className="font-display text-sm font-semibold text-foreground">LDA Summary</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysisReport.ldaSummary}</p>
            </Card>

            <Card className="glass-card p-6 border-primary/20 animate-slide-up stagger-3">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="font-display text-sm font-semibold text-foreground">Recommendation</h4>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{analysisReport.recommendation}</p>
            </Card>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard/visualize")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={() => { setCurrentStep(6); navigate("/dashboard/export"); }}
            disabled={!analysisReport}
            className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            Export Results <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Report;
