import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createReport, listReports, downloadReport } from "../controllers/reportController.js";

const router = Router();

router.use(requireAuth);

router.post("/", createReport);
router.get("/", listReports);
router.get("/:id/download", downloadReport);

export default router;
