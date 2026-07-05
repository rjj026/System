import React, { createContext, useContext, useState, ReactNode } from "react";

export type DatasetType = string;

export interface DatasetQualityReport {
  rowsBefore: number;
  rowsAfter: number;
  duplicates: number;
  nullCells: number;
  blankCells: number;
  nullRows: number[];
  duplicateRows: number[];
  blankCellMap: Record<number, number[]>; // rowIndex (after-clean) -> col indices that were blank in raw
  runtimeMs: number;
}

export interface DatasetFile {
  name: string;
  type: DatasetType;
  data: number[][];
  headers: string[];
  rows: number;
  cols: number;
  quality?: DatasetQualityReport;
  rawPreview?: (string | number)[][]; // first 100 raw rows for preview/highlighting
}

export interface PreprocessedData {
  normalized: number[][];
  missingValuesHandled: number;
  outliersRemoved: number;
  scalingMethod: string;
}

export interface PCAResult {
  components: number[][];
  explainedVariance: number[];
  cumulativeVariance: number[];
  eigenvalues: number[];
  reducedData: number[][];
  reconstructionAccuracy?: number;
}

export interface LDAResult {
  components: number[][];
  explainedVariance: number[];
  classAccuracy: number;
  reducedData: number[][];
}

export interface AnalysisReport {
  pcaSummary: string;
  ldaSummary: string;
  recommendation: string;
  timestamp: string;
}

interface AppState {
  isAuthenticated: boolean;
  currentStep: number;
  datasets: DatasetFile[];
  preprocessedData: PreprocessedData | null;
  pcaResult: PCAResult | null;
  ldaResult: LDAResult | null;
  analysisReport: AnalysisReport | null;
}

interface AppContextType extends AppState {
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setCurrentStep: (step: number) => void;
  addDataset: (dataset: DatasetFile) => void;
  removeDataset: (index: number) => void;
  setPreprocessedData: (data: PreprocessedData) => void;
  setPcaResult: (result: PCAResult) => void;
  setLdaResult: (result: LDAResult) => void;
  setAnalysisReport: (report: AnalysisReport) => void;
  resetAll: () => void;
}

const initialState: AppState = {
  isAuthenticated: false,
  currentStep: 0,
  datasets: [],
  preprocessedData: null,
  pcaResult: null,
  ldaResult: null,
  analysisReport: null,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(initialState);

  const login = (username: string, password: string) => {
    if (username === "admin" && password === "admin123") {
      setState((s) => ({ ...s, isAuthenticated: true }));
      return true;
    }
    return false;
  };

  const logout = () => setState(initialState);

  const setCurrentStep = (step: number) =>
    setState((s) => ({ ...s, currentStep: step }));

  const addDataset = (dataset: DatasetFile) =>
    setState((s) => ({ ...s, datasets: [...s.datasets, dataset] }));

  const removeDataset = (index: number) =>
    setState((s) => ({
      ...s,
      datasets: s.datasets.filter((_, i) => i !== index),
    }));

  const setPreprocessedData = (data: PreprocessedData) =>
    setState((s) => ({ ...s, preprocessedData: data }));

  const setPcaResult = (result: PCAResult) =>
    setState((s) => ({ ...s, pcaResult: result }));

  const setLdaResult = (result: LDAResult) =>
    setState((s) => ({ ...s, ldaResult: result }));

  const setAnalysisReport = (report: AnalysisReport) =>
    setState((s) => ({ ...s, analysisReport: report }));

  const resetAll = () =>
    setState((s) => ({ ...initialState, isAuthenticated: s.isAuthenticated }));

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        logout,
        setCurrentStep,
        addDataset,
        removeDataset,
        setPreprocessedData,
        setPcaResult,
        setLdaResult,
        setAnalysisReport,
        resetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
