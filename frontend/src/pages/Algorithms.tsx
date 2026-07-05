import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, CheckCircle2, Play, BarChart3, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { runPCA, runLDA } from "@/lib/algorithms";

const Algorithms = () => {
  const { preprocessedData, pcaResult, ldaResult, setPcaResult, setLdaResult, setCurrentStep } = useApp();
  const navigate = useNavigate();
  const [runningPCA, setRunningPCA] = useState(false);
  const [runningLDA, setRunningLDA] = useState(false);
  const [pcaProgress, setPcaProgress] = useState(0);
  const [ldaProgress, setLdaProgress] = useState(0);

  const data = preprocessedData?.normalized || [];

  const handlePCA = async () => {
    setRunningPCA(true);
    setPcaProgress(0);
    for (let i = 1; i <= 4; i++) {
      await new Promise((r) => setTimeout(r, 350));
      setPcaProgress(i * 25);
    }
    setPcaResult(runPCA(data, 2));
    setRunningPCA(false);
  };

  const handleLDA = async () => {
    setRunningLDA(true);
    setLdaProgress(0);
    for (let i = 1; i <= 4; i++) {
      await new Promise((r) => setTimeout(r, 350));
      setLdaProgress(i * 25);
    }
    setLdaResult(runLDA(data, 2));
    setRunningLDA(false);
  };

  const bothDone = pcaResult && ldaResult;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Apply Algorithms</h1>
              <p className="text-sm text-muted-foreground">Run PCA and LDA dimensionality reduction algorithms.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* PCA Card */}
          <Card className="glass-card p-6 animate-slide-up stagger-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">PCA</h3>
                <p className="text-xs text-muted-foreground">Principal Component Analysis</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Unsupervised linear transformation to maximize variance retention.
            </p>
            {pcaResult ? (
              <div className="space-y-2 animate-scale-in">
                <div className="flex items-center gap-2 text-success mb-3">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-semibold">Completed</span>
                </div>
                {pcaResult.explainedVariance.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                    <span className="text-xs font-mono text-muted-foreground w-8">PC{i + 1}</span>
                    <Progress value={v} className="h-2 flex-1" />
                    <span className="text-sm font-bold text-foreground w-14 text-right">{v.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : runningPCA ? (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  <span className="text-sm text-muted-foreground">Running PCA...</span>
                </div>
                <Progress value={pcaProgress} className="h-2" />
              </div>
            ) : (
              <Button onClick={handlePCA} className="w-full gradient-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Play className="mr-2 h-4 w-4" /> Run PCA
              </Button>
            )}
          </Card>

          {/* LDA Card */}
          <Card className="glass-card p-6 animate-slide-up stagger-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">LDA</h3>
                <p className="text-xs text-muted-foreground">Linear Discriminant Analysis</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Supervised method to maximize class separability.
            </p>
            {ldaResult ? (
              <div className="space-y-2 animate-scale-in">
                <div className="flex items-center gap-2 text-success mb-3">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-semibold">Completed</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-success/5 border border-success/20 px-3 py-2.5">
                  <span className="text-xs font-mono text-muted-foreground">Accuracy</span>
                  <div className="flex-1" />
                  <span className="text-sm font-bold text-success">{ldaResult.classAccuracy.toFixed(1)}%</span>
                </div>
                {ldaResult.explainedVariance.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                    <span className="text-xs font-mono text-muted-foreground w-8">LD{i + 1}</span>
                    <Progress value={v} className="h-2 flex-1" />
                    <span className="text-sm font-bold text-foreground w-14 text-right">{v.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : runningLDA ? (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                  <span className="text-sm text-muted-foreground">Running LDA...</span>
                </div>
                <Progress value={ldaProgress} className="h-2" />
              </div>
            ) : (
              <Button onClick={handleLDA} className="w-full bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90">
                <Play className="mr-2 h-4 w-4" /> Run LDA
              </Button>
            )}
          </Card>
        </div>

        {bothDone && (
          <Card className="glass-card p-5 border-success/20 animate-scale-in">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-display text-sm font-semibold">Both algorithms completed successfully — ready for analysis.</span>
            </div>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard/preprocess")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={() => { setCurrentStep(3); navigate("/dashboard/visualize"); }}
            disabled={!bothDone}
            className="gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            View Analysis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Algorithms;
