import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import Login from "./pages/Login";
import UploadDataset from "./pages/UploadDataset";
import Preprocess from "./pages/Preprocess";
import Algorithms from "./pages/Algorithms";
import Visualize from "./pages/Visualize";

import Report from "./pages/Report";
import ExportResults from "./pages/ExportResults";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/dashboard" element={<ProtectedRoute><UploadDataset /></ProtectedRoute>} />
    <Route path="/dashboard/preprocess" element={<ProtectedRoute><Preprocess /></ProtectedRoute>} />
    <Route path="/dashboard/algorithms" element={<ProtectedRoute><Algorithms /></ProtectedRoute>} />
    <Route path="/dashboard/visualize" element={<ProtectedRoute><Visualize /></ProtectedRoute>} />
    <Route path="/dashboard/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
    <Route path="/dashboard/export" element={<ProtectedRoute><ExportResults /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
