import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { uploadCsv } from "../middleware/upload.js";
import {
  uploadDataset,
  listDatasets,
  getDataset,
  downloadDataset,
  deleteDataset,
} from "../controllers/datasetController.js";

const router = Router();

router.use(requireAuth);

router.post("/", uploadCsv.single("file"), uploadDataset);
router.get("/", listDatasets);
router.get("/:id", getDataset);
router.get("/:id/download", downloadDataset);
router.delete("/:id", deleteDataset);

export default router;
