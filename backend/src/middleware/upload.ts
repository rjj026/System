import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASETS_DIR = path.join(__dirname, "..", "storage", "datasets");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DATASETS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".csv";
    cb(null, `${uuidv4()}${ext}`);
  },
});

function csvFileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const isCsv = file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv");
  if (!isCsv) {
    return cb(new Error("Only .csv files are accepted"));
  }
  cb(null, true);
}

export const uploadCsv = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB cap
});
