import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple file-backed JSON "database". This keeps the backend dependency-free
// (no Postgres/Mongo setup needed) which is a reasonable default for a
// capstone project. Swap this out for a real database later if needed —
// every function here just needs to be re-pointed at real queries.

function filePath(name: string): string {
  return path.join(__dirname, `${name}.json`);
}

function readAll<T>(name: string): T[] {
  const p = filePath(name);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, "[]", "utf-8");
    return [];
  }
  const raw = fs.readFileSync(p, "utf-8").trim();
  return raw ? (JSON.parse(raw) as T[]) : [];
}

function writeAll<T>(name: string, records: T[]): void {
  fs.writeFileSync(filePath(name), JSON.stringify(records, null, 2), "utf-8");
}

export const jsonStore = {
  getAll<T>(collection: string): T[] {
    return readAll<T>(collection);
  },
  insert<T>(collection: string, record: T): T {
    const all = readAll<T>(collection);
    all.push(record);
    writeAll(collection, all);
    return record;
  },
  findOne<T>(collection: string, predicate: (item: T) => boolean): T | undefined {
    return readAll<T>(collection).find(predicate);
  },
  findMany<T>(collection: string, predicate: (item: T) => boolean): T[] {
    return readAll<T>(collection).filter(predicate);
  },
  update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>): T | undefined {
    const all = readAll<T>(collection);
    const idx = all.findIndex((item) => item.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...patch };
    writeAll(collection, all);
    return all[idx];
  },
  remove(collection: string, id: string): boolean {
    const all = readAll<{ id: string }>(collection);
    const filtered = all.filter((item) => item.id !== id);
    if (filtered.length === all.length) return false;
    writeAll(collection, filtered);
    return true;
  },
};
