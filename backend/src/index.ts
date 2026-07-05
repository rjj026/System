import express from "express";
import cors from "cors";
import uploadRoutes from "./routes/upload";
import datasetRoutes from "./routes/dataset";
import algorithmRoutes from "./routes/algorithms";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api", uploadRoutes);
app.use("/api", datasetRoutes);
app.use("/api", algorithmRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(PORT, () => {
  console.log(`DIME System backend running on http://localhost:${PORT}`);
});
