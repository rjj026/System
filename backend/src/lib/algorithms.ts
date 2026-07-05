// Real PCA and LDA implementations (no simulation/randomness in the math).
//
// PCA: standardization -> covariance matrix -> Jacobi eigendecomposition ->
//      sort by eigenvalue -> project onto top-k eigenvectors.
// LDA: requires class labels (supervised). If no labels are supplied, this
//      falls back to k-means pseudo-labels so the function still runs against
//      a plain data matrix -- but that is NOT genuine supervised LDA. Pass
//      real class labels whenever you have them.

// ---------- Basic vector/matrix helpers ----------

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function transpose(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0].length;
  const t: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      t[j][i] = m[i][j];
    }
  }
  return t;
}

function matMul(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  const k = b.length;
  const m = b[0].length;
  const result: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let x = 0; x < k; x++) sum += a[i][x] * b[x][j];
      result[i][j] = sum;
    }
  }
  return result;
}

function matVecMul(a: number[][], v: number[]): number[] {
  return a.map((row) => row.reduce((s, val, j) => s + val * v[j], 0));
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

function standardize(data: number[][]): { std: number[][]; means: number[]; stds: number[] } {
  const cols = data[0].length;
  const means = Array.from({ length: cols }, (_, j) => mean(data.map((r) => r[j])));
  const stds = Array.from({ length: cols }, (_, j) => {
    const m = means[j];
    const variance = data.reduce((s, r) => s + (r[j] - m) ** 2, 0) / data.length;
    return Math.sqrt(variance) || 1;
  });
  const std = data.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
  return { std, means, stds };
}

/** Sample covariance matrix (p x p) of already-centered/standardized data (n x p). */
function covarianceMatrix(data: number[][]): number[][] {
  const n = data.length;
  const p = data[0].length;
  const cov: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      let sum = 0;
      for (let r = 0; r < n; r++) sum += data[r][i] * data[r][j];
      const val = sum / (n - 1 || 1);
      cov[i][j] = val;
      cov[j][i] = val;
    }
  }
  return cov;
}

/**
 * Classic cyclic Jacobi eigenvalue algorithm for a real symmetric matrix.
 * Returns eigenvalues and eigenvectors (as columns of a matrix), unsorted.
 * Standard, numerically stable approach for small/medium symmetric matrices
 * (typical feature-count sizes in a PCA/LDA covariance or scatter matrix).
 */
function jacobiEigenDecomposition(
  matrix: number[][],
  maxSweeps: number = 100,
  tolerance: number = 1e-10,
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  let v = identity(n);

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let offDiagSum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) offDiagSum += a[i][j] * a[i][j];
    }
    if (offDiagSum < tolerance) break;

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-15) continue;

        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;

        const app = a[p][p];
        const aqq = a[q][q];
        const apq = a[p][q];

        a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
        a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
        a[p][q] = 0;
        a[q][p] = 0;

        for (let i = 0; i < n; i++) {
          if (i !== p && i !== q) {
            const aip = a[i][p];
            const aiq = a[i][q];
            a[i][p] = c * aip - s * aiq;
            a[p][i] = a[i][p];
            a[i][q] = s * aip + c * aiq;
            a[q][i] = a[i][q];
          }
        }

        for (let i = 0; i < n; i++) {
          const vip = v[i][p];
          const viq = v[i][q];
          v[i][p] = c * vip - s * viq;
          v[i][q] = s * vip + c * viq;
        }
      }
    }
  }

  const eigenvalues = Array.from({ length: n }, (_, i) => a[i][i]);
  return { eigenvalues, eigenvectors: v };
}

/** Sort eigenvalues (desc) and reorder eigenvector columns to match. */
function sortEigen(eigenvalues: number[], eigenvectors: number[][]) {
  const n = eigenvalues.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => eigenvalues[b] - eigenvalues[a]);
  const sortedValues = idx.map((i) => Math.max(eigenvalues[i], 0)); // guard tiny negative noise
  const sortedVectors = idx.map((i) => eigenvectors.map((row) => row[i]));
  // sortedVectors currently rows = components; convert to column-per-component p x k
  const p = eigenvectors.length;
  const k = sortedVectors.length;
  const cols: number[][] = Array.from({ length: k }, (_, c) => Array.from({ length: p }, (_, r) => sortedVectors[c][r]));
  return { values: sortedValues, vectors: cols }; // vectors[c] is the c-th eigenvector, length p
}

// ---------- PCA ----------

export interface PCAOutput {
  components: number[][]; // components[c] = c-th eigenvector (length = original feature count)
  explainedVariance: number[]; // percent, per selected component
  cumulativeVariance: number[]; // percent, cumulative
  eigenvalues: number[];
  reducedData: number[][]; // n x nComponents
  reconstructionAccuracy: number; // cumulative variance retained by selected components
}

export function runPCA(data: number[][], nComponents: number = 2): PCAOutput {
  const { std } = standardize(data);
  const p = std[0].length;
  const actualComponents = Math.min(nComponents, p);

  const cov = covarianceMatrix(std);
  const { eigenvalues, eigenvectors } = jacobiEigenDecomposition(cov);
  const { values, vectors } = sortEigen(eigenvalues, eigenvectors);

  const totalVar = values.reduce((a, b) => a + b, 0) || 1;
  const explainedVarianceAll = values.map((v) => (v / totalVar) * 100);
  const cumulativeVarianceAll = explainedVarianceAll.reduce<number[]>((acc, v) => {
    acc.push((acc[acc.length - 1] || 0) + v);
    return acc;
  }, []);

  const components = vectors.slice(0, actualComponents);
  const reducedData = std.map((row) => components.map((vec) => row.reduce((s, val, j) => s + val * vec[j], 0)));

  return {
    components,
    explainedVariance: explainedVarianceAll.slice(0, actualComponents),
    cumulativeVariance: cumulativeVarianceAll.slice(0, actualComponents),
    eigenvalues: values.slice(0, actualComponents),
    reducedData,
    reconstructionAccuracy: cumulativeVarianceAll[actualComponents - 1] || 0,
  };
}

// ---------- LDA ----------

export interface LDAOutput {
  components: number[][];
  explainedVariance: number[];
  classAccuracy: number; // real nearest-centroid classification accuracy on projected data
  reducedData: number[][];
  usedPseudoLabels: boolean; // true if no labels were supplied and k-means fallback was used
}

/** Simple k-means (Euclidean) used only as a fallback when no real class labels exist. */
function kMeansPseudoLabels(data: number[][], k: number, maxIter: number = 50): number[] {
  const n = data.length;
  const p = data[0].length;
  // init centroids from k evenly spaced points (deterministic, not random)
  let centroids = Array.from({ length: k }, (_, c) => data[Math.floor((c * n) / k)].slice());
  let labels = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        let dist = 0;
        for (let j = 0; j < p; j++) dist += (data[i][j] - centroids[c][j]) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      if (labels[i] !== best) changed = true;
      labels[i] = best;
    }
    const sums = Array.from({ length: k }, () => new Array(p).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      counts[labels[i]]++;
      for (let j = 0; j < p; j++) sums[labels[i]][j] += data[i][j];
    }
    centroids = sums.map((s, c) => (counts[c] > 0 ? s.map((v) => v / counts[c]) : centroids[c]));
    if (!changed) break;
  }
  return labels;
}

export function runLDA(data: number[][], nComponents: number = 2, labels?: number[]): LDAOutput {
  const { std } = standardize(data);
  const n = std.length;
  const p = std[0].length;

  const usedPseudoLabels = !labels;
  const classLabels = labels && labels.length === n ? labels : kMeansPseudoLabels(std, Math.min(3, n));

  const classes = Array.from(new Set(classLabels)).sort();
  const numClasses = classes.length;
  const actualComponents = Math.min(nComponents, p, Math.max(numClasses - 1, 1));

  const overallMean = Array.from({ length: p }, (_, j) => mean(std.map((r) => r[j])));

  const classMeans: number[][] = [];
  const classData: number[][][] = [];
  for (const cls of classes) {
    const rows = std.filter((_, i) => classLabels[i] === cls);
    classData.push(rows);
    classMeans.push(Array.from({ length: p }, (_, j) => mean(rows.map((r) => r[j]))));
  }

  // Within-class scatter Sw
  const sw: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  classData.forEach((rows, ci) => {
    rows.forEach((row) => {
      const diff = row.map((v, j) => v - classMeans[ci][j]);
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) sw[i][j] += diff[i] * diff[j];
      }
    });
  });
  // regularize for invertibility (common practical fix for small/singular Sw)
  for (let i = 0; i < p; i++) sw[i][i] += 1e-6;

  // Between-class scatter Sb
  const sb: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  classMeans.forEach((cm, ci) => {
    const nc = classData[ci].length;
    const diff = cm.map((v, j) => v - overallMean[j]);
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) sb[i][j] += nc * diff[i] * diff[j];
    }
  });

  // Solve generalized eigenproblem Sw^-1 Sb via symmetric whitening:
  // Sw = U Λ U^T  =>  Sw^{-1/2} = U Λ^{-1/2} U^T
  // M = Sw^{-1/2} Sb Sw^{-1/2} is symmetric -> eigendecompose M -> w = Sw^{-1/2} v
  const { eigenvalues: swVals, eigenvectors: swVecs } = jacobiEigenDecomposition(sw);
  const invSqrtDiag = swVals.map((v) => 1 / Math.sqrt(Math.max(v, 1e-8)));
  // Sw^{-1/2} = swVecs * diag(invSqrtDiag) * swVecs^T
  const swVecsT = transpose(swVecs);
  const scaled = swVecs.map((row) => row.map((val, j) => val * invSqrtDiag[j]));
  const swInvSqrt = matMul(scaled, swVecsT);

  const m1 = matMul(swInvSqrt, sb);
  const M = matMul(m1, swInvSqrt);

  const { eigenvalues: mVals, eigenvectors: mVecs } = jacobiEigenDecomposition(M);
  const { values: sortedVals, vectors: sortedVecs } = sortEigen(mVals, mVecs);

  // transform eigenvectors back: w = Sw^{-1/2} v
  const components = sortedVecs.slice(0, actualComponents).map((v) => matVecMul(swInvSqrt, v));

  const totalDiscriminantPower = sortedVals.reduce((a, b) => a + b, 0) || 1;
  const explainedVariance = sortedVals.slice(0, actualComponents).map((v) => (v / totalDiscriminantPower) * 100);

  const reducedData = std.map((row) => components.map((vec) => row.reduce((s, val, j) => s + val * vec[j], 0)));

  // Real classification accuracy: nearest-centroid classifier on the projected data.
  const projectedClassMeans = classes.map((cls, ci) => {
    const projRows = reducedData.filter((_, i) => classLabels[i] === cls);
    return Array.from({ length: actualComponents }, (_, j) => mean(projRows.map((r) => r[j])));
  });
  let correct = 0;
  reducedData.forEach((row, i) => {
    let best = 0;
    let bestDist = Infinity;
    projectedClassMeans.forEach((cm, ci) => {
      const dist = row.reduce((s, v, j) => s + (v - cm[j]) ** 2, 0);
      if (dist < bestDist) {
        bestDist = dist;
        best = ci;
      }
    });
    if (classes[best] === classLabels[i]) correct++;
  });
  const classAccuracy = (correct / n) * 100;

  return {
    components,
    explainedVariance,
    classAccuracy,
    reducedData,
    usedPseudoLabels,
  };
}

// ---------- Preprocessing (unchanged behavior, still real, not simulated) ----------

export function preprocessData(data: number[][]) {
  let missingValuesHandled = 0;
  let outliersRemoved = 0;

  const cleaned = data.map((row) =>
    row.map((v) => {
      if (isNaN(v) || v === null || v === undefined) {
        missingValuesHandled++;
        return 0;
      }
      return v;
    }),
  );

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
    }),
  );

  return {
    normalized,
    missingValuesHandled,
    outliersRemoved,
    scalingMethod: "Z-Score Normalization",
  };
}

export function generateSampleData(rows: number = 50, cols: number = 5): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.random() * 100 - 50));
}

export function generateHeaders(cols: number): string[] {
  return Array.from({ length: cols }, (_, i) => `Feature_${i + 1}`);
}
