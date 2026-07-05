import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import datasetRoutes from "./routes/dataset.routes.js";
import reportRoutes from "./routes/report.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure storage directories exist on first run
for (const dir of ["storage/datasets", "storage/reports", "data"]) {
  const full = path.join(__dirname, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
}

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:8080",
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/datasets", datasetRoutes);
app.use("/api/reports", reportRoutes);

// Central error handler (e.g. multer file-type/size rejections land here)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`DimReduce backend running on http://localhost:${PORT}`);
});
