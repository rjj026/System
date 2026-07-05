import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import {
  Upload,
  Settings,
  BarChart3,
  Eye,
  FileText,
  Download,
  LogOut,
  Activity,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const steps = [
  { label: "Upload", icon: Upload, path: "/dashboard" },
  { label: "Preprocess", icon: Settings, path: "/dashboard/preprocess" },
  { label: "Algorithms", icon: BarChart3, path: "/dashboard/algorithms" },
  { label: "Visualize & Analysis", icon: Eye, path: "/dashboard/visualize" },
  { label: "Report", icon: FileText, path: "/dashboard/report" },
  { label: "Export", icon: Download, path: "/dashboard/export" },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { logout, currentStep } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const activeIndex = steps.findIndex((s) => s.path === location.pathname);
  const progressPercent = Math.round(((activeIndex + 1) / steps.length) * 100);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-md">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold text-sidebar-primary-foreground leading-tight">
              DimReduce
            </span>
            <span className="text-[10px] text-sidebar-foreground/50">Analysis System</span>
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">Progress</span>
            <span className="text-[10px] font-bold text-sidebar-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5 bg-sidebar-accent" />
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {steps.map((step, i) => {
            const isActive = location.pathname === step.path;
            const isCompleted = i < currentStep;
            const isAccessible = i <= currentStep;
            return (
              <button
                key={step.path}
                onClick={() => isAccessible && navigate(step.path)}
                disabled={!isAccessible}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : isCompleted
                    ? "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    : isAccessible
                    ? "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    : "text-sidebar-foreground/25 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  isActive ? "gradient-primary shadow-sm" : isCompleted ? "bg-sidebar-primary/20" : "bg-sidebar-accent"
                )}>
                  {isCompleted && !isActive ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-sidebar-primary" />
                  ) : (
                    <step.icon className={cn("h-3.5 w-3.5", isActive ? "text-primary-foreground" : "text-current")} />
                  )}
                </div>
                <span className="flex-1 text-left">{step.label}</span>
                {isActive && (
                  <ChevronRight className="h-4 w-4 animate-fade-in" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-5xl animate-fade-in">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
