import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, FileJson, FileText, Table, FileDown, PartyPopper, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ExportResults = () => {
  const { pcaResult, ldaResult, analysisReport, preprocessedData } = useApp();
  const navigate = useNavigate();

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = { pcaResult, ldaResult, analysisReport, preprocessedData: { ...preprocessedData, normalized: `[${preprocessedData?.normalized.length} rows]` } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, "dimreduce_results.json");
    toast.success("JSON exported successfully");
  };

  const exportCSV = () => {
    if (!pcaResult) return;
    const header = pcaResult.reducedData[0].map((_, i) => `PC${i + 1}`).join(",");
    const rows = pcaResult.reducedData.map((r) => r.join(",")).join("\n");
    downloadBlob(new Blob([header + "\n" + rows], { type: "text/csv" }), "pca_reduced_data.csv");
    toast.success("CSV exported successfully");
  };

  const exportReport = () => {
    if (!analysisReport) return;
    const text = `DIMENSIONALITY REDUCTION ANALYSIS REPORT\nGenerated: ${new Date(analysisReport.timestamp).toLocaleString()}\n${"=".repeat(50)}\n\nPCA SUMMARY\n${analysisReport.pcaSummary}\n\nLDA SUMMARY\n${analysisReport.ldaSummary}\n\nRECOMMENDATION\n${analysisReport.recommendation}`;
    downloadBlob(new Blob([text], { type: "text/plain" }), "analysis_report.txt");
    toast.success("Report exported successfully");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Dimensionality Reduction", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("Analysis Report", pageWidth / 2, 28, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Generated: ${analysisReport ? new Date(analysisReport.timestamp).toLocaleString() : new Date().toLocaleString()}`, pageWidth / 2, 35, { align: "center" });
    doc.setTextColor(0);

    let y = 45;

    if (pcaResult) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("PCA Results", 14, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [["Component", "Explained Variance (%)", "Cumulative Variance (%)", "Eigenvalue"]],
        body: pcaResult.explainedVariance.map((v, i) => [`PC${i + 1}`, v.toFixed(2), (pcaResult.cumulativeVariance[i] || 0).toFixed(2), (pcaResult.eigenvalues[i] || 0).toFixed(4)]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (ldaResult) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("LDA Results", 14, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [["Component", "Explained Variance (%)", "Class Accuracy (%)"]],
        body: ldaResult.explainedVariance.map((v, i) => [`LD${i + 1}`, v.toFixed(2), i === 0 ? ldaResult.classAccuracy.toFixed(2) : "—"]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (preprocessedData) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Preprocessing Summary", 14, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [["Scaling Method", preprocessedData.scalingMethod], ["Missing Values Handled", String(preprocessedData.missingValuesHandled)], ["Outliers Removed", String(preprocessedData.outliersRemoved)], ["Data Rows", String(preprocessedData.normalized.length)]],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (analysisReport) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Analysis Summary", 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PCA Summary:", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const pcaLines = doc.splitTextToSize(analysisReport.pcaSummary, pageWidth - 28);
      doc.text(pcaLines, 14, y);
      y += pcaLines.length * 5 + 6;
      doc.setFont("helvetica", "bold");
      doc.text("LDA Summary:", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const ldaLines = doc.splitTextToSize(analysisReport.ldaSummary, pageWidth - 28);
      doc.text(ldaLines, 14, y);
      y += ldaLines.length * 5 + 6;
      doc.setFont("helvetica", "bold");
      doc.text("Recommendation:", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const recLines = doc.splitTextToSize(analysisReport.recommendation, pageWidth - 28);
      doc.text(recLines, 14, y);
    }

    doc.save("dimreduce_report.pdf");
    toast.success("PDF exported successfully");
  };

  const exports = [
    { label: "JSON Export", desc: "Full results with all algorithm outputs", icon: FileJson, action: exportJSON, color: "bg-primary/10 text-primary" },
    { label: "CSV Export", desc: "PCA reduced data matrix", icon: Table, action: exportCSV, color: "bg-success/10 text-success" },
    { label: "Text Report", desc: "Plain text analysis summary", icon: FileText, action: exportReport, color: "bg-accent/10 text-accent" },
    { label: "PDF Report", desc: "Professional report with tables", icon: FileDown, action: exportPDF, color: "bg-warning/10 text-warning" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md">
              <Download className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Export Results</h1>
              <p className="text-sm text-muted-foreground">Download your analysis results in various formats.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {exports.map((exp, idx) => (
            <Card key={exp.label} className={`glass-card p-6 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 animate-slide-up stagger-${idx + 1}`}>
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${exp.color}`}>
                <exp.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-1 font-display text-sm font-semibold text-foreground">{exp.label}</h3>
              <p className="mb-4 text-xs text-muted-foreground">{exp.desc}</p>
              <Button onClick={exp.action} variant="outline" size="sm" className="w-full group">
                <Download className="mr-2 h-3 w-3 transition-transform group-hover:translate-y-0.5" /> Download
              </Button>
            </Card>
          ))}
        </div>

        <Card className="glass-card p-8 text-center border-success/20 animate-scale-in">
          <PartyPopper className="mx-auto mb-3 h-10 w-10 text-success" />
          <p className="text-lg font-display font-bold text-foreground">Workflow Complete!</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            All steps of the dimensionality reduction pipeline have been completed successfully.
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Preprocessed</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Analyzed</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Reported</span>
          </div>
        </Card>

        <div className="flex justify-start">
          <Button variant="outline" onClick={() => navigate("/dashboard/report")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ExportResults;
