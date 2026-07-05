// Real duplicate/null/blank detection over parsed tabular data.
// Operates on raw parsed cells (string | number) before numeric conversion,
// so it can flag things like "" (blank) separately from actual missing/NaN values.

export interface QualityReport {
  rowsBefore: number;
  rowsAfter: number;
  duplicates: number;
  duplicateRows: number[];
  nullCells: number;
  nullRows: number[];
  blankCells: number;
  blankCellMap: Record<number, number[]>; // rowIndex -> column indices that were blank
  runtimeMs: number;
}

function isBlank(cell: unknown): boolean {
  return cell === "" || cell === null || cell === undefined;
}

function isNullLike(cell: unknown): boolean {
  if (cell === null || cell === undefined) return true;
  if (typeof cell === "number" && Number.isNaN(cell)) return true;
  if (typeof cell === "string") {
    const v = cell.trim().toLowerCase();
    return v === "null" || v === "nan" || v === "n/a" || v === "na" || v === "undefined";
  }
  return false;
}

/**
 * Analyze raw parsed rows (as they came out of the file, before numeric coercion).
 * rowsBefore = total rows in the file (including ones that get dropped as fully blank).
 * rowsAfter = rows remaining once fully-blank rows are dropped (the "cleaned" set).
 */
export function analyzeQuality(rows: (string | number)[][]): QualityReport {
  const start = Date.now();

  const rowsBefore = rows.length;

  let nullCells = 0;
  let blankCells = 0;
  const nullRowsSet = new Set<number>();
  const blankCellMap: Record<number, number[]> = {};
  const keptRowIndices: number[] = [];

  rows.forEach((row, i) => {
    let rowIsFullyBlank = true;
    const blankCols: number[] = [];

    row.forEach((cell, j) => {
      const blank = isBlank(cell);
      const nullLike = isNullLike(cell);

      if (blank) {
        blankCells++;
        blankCols.push(j);
      } else {
        rowIsFullyBlank = false;
      }
      if (nullLike) {
        nullCells++;
        nullRowsSet.add(i);
      }
    });

    if (blankCols.length > 0) blankCellMap[i] = blankCols;
    if (!rowIsFullyBlank) keptRowIndices.push(i);
  });

  // Duplicate detection: exact row match after trimming/stringifying each cell
  const seen = new Map<string, number>();
  const duplicateRows: number[] = [];
  keptRowIndices.forEach((i) => {
    const key = rows[i].map((c) => String(c).trim().toLowerCase()).join("|");
    if (seen.has(key)) {
      duplicateRows.push(i);
    } else {
      seen.set(key, i);
    }
  });

  const rowsAfter = keptRowIndices.length - duplicateRows.length;

  const runtimeMs = Date.now() - start;

  return {
    rowsBefore,
    rowsAfter,
    duplicates: duplicateRows.length,
    duplicateRows,
    nullCells,
    nullRows: Array.from(nullRowsSet),
    blankCells,
    blankCellMap,
    runtimeMs,
  };
}

/** Remove fully-blank rows and exact duplicate rows, returning the cleaned dataset. */
export function cleanRows(rows: (string | number)[][], report: QualityReport): (string | number)[][] {
  const dupSet = new Set(report.duplicateRows);
  return rows.filter((row, i) => {
    const fullyBlank = row.every((c) => isBlank(c));
    return !fullyBlank && !dupSet.has(i);
  });
}
