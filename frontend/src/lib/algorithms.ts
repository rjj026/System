// Simulated PCA and LDA algorithms for demonstration

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardize(data: number[][]): number[][] {
  const cols = data[0].length;
  const means = Array.from({ length: cols }, (_, j) => mean(data.map((r) => r[j])));
  const stds = Array.from({ length: cols }, (_, j) => {
    const m = means[j];
    const variance = data.reduce((s, r) => s + (r[j] - m) ** 2, 0) / data.length;
    return Math.sqrt(variance) || 1;
  });
  return data.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
}

export function runPCA(data: number[][], nComponents: number = 2) {
  const std = standardize(data);
  const n = std.length;
  const p = std[0].length;
  const actualComponents = Math.min(nComponents, p);

  // Simulated eigenvalues (decreasing)
  const eigenvalues = Array.from({ length: p }, (_, i) =>
    Math.max(0.1, (p - i) * (1 + Math.random() * 0.5))
  );
  const totalVar = eigenvalues.reduce((a, b) => a + b, 0);
  const explainedVariance = eigenvalues.map((e) => (e / totalVar) * 100);
  const cumulativeVariance = explainedVariance.reduce<number[]>((acc, v) => {
    acc.push((acc[acc.length - 1] || 0) + v);
    return acc;
  }, []);

  // Project data to lower dimensions with meaningful spread
  const components = Array.from({ length: actualComponents }, (_, c) =>
    Array.from({ length: p }, (_, j) =>
      Math.cos((c * j * Math.PI) / p) / Math.sqrt(p)
    )
  );

  const reducedData = std.map((row) =>
    components.map((comp) => {
      const proj = row.reduce((sum, val, j) => sum + val * comp[j], 0);
      return proj + (Math.random() - 0.5) * 0.8;
    })
  );

  // PCA "accuracy" = reconstruction accuracy = cumulative variance retained by selected components
  const reconstructionAccuracy = cumulativeVariance[actualComponents - 1] || 0;

  return {
    components,
    explainedVariance: explainedVariance.slice(0, actualComponents),
    cumulativeVariance: cumulativeVariance.slice(0, actualComponents),
    eigenvalues: eigenvalues.slice(0, actualComponents),
    reducedData,
    reconstructionAccuracy,
  };
}

export function runLDA(data: number[][], nComponents: number = 2) {
  const std = standardize(data);
  const p = std[0].length;
  const actualComponents = Math.min(nComponents, p);

  // Simulate LDA with class separation
  const components = Array.from({ length: actualComponents }, (_, c) =>
    Array.from({ length: p }, (_, j) =>
      Math.sin(((c + 1) * j * Math.PI) / p) / Math.sqrt(p)
    )
  );

  const reducedData = std.map((row) =>
    components.map((comp) => {
      const proj = row.reduce((sum, val, j) => sum + val * comp[j], 0);
      return proj + (Math.random() - 0.5) * 0.6;
    })
  );

  const totalVar = actualComponents * 30 + Math.random() * 20;
  const explainedVariance = Array.from(
    { length: actualComponents },
    (_, i) => (totalVar * (actualComponents - i)) / ((actualComponents * (actualComponents + 1)) / 2)
  );

  return {
    components,
    explainedVariance,
    classAccuracy: 75 + Math.random() * 20,
    reducedData,
  };
}

export function preprocessData(data: number[][]) {
  let missingValuesHandled = 0;
  let outliersRemoved = 0;

  // Handle missing/NaN values
  const cleaned = data.map((row) =>
    row.map((v) => {
      if (isNaN(v) || v === null || v === undefined) {
        missingValuesHandled++;
        return 0;
      }
      return v;
    })
  );

  // Simple outlier detection (z-score > 3)
  const cols = cleaned[0].length;
  const means = Array.from({ length: cols }, (_, j) => mean(cleaned.map((r) => r[j])));
  const stds = Array.from({ length: cols }, (_, j) => {
    const m = means[j];
    return Math.sqrt(cleaned.reduce((s, r) => s + (r[j] - m) ** 2, 0) / cleaned.length) || 1;
  });

  const normalized = cleaned.map((row) =>
    row.map((v, j) => {
      const z = Math.abs((v - means[j]) / stds[j]);
      if (z > 3) {
        outliersRemoved++;
        return means[j];
      }
      return (v - means[j]) / stds[j];
    })
  );

  return {
    normalized,
    missingValuesHandled,
    outliersRemoved,
    scalingMethod: "Z-Score Normalization",
  };
}

export function generateSampleData(rows: number = 50, cols: number = 5): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.random() * 100 - 50)
  );
}

export function generateHeaders(cols: number): string[] {
  return Array.from({ length: cols }, (_, i) => `Feature_${i + 1}`);
}
