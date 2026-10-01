import express from "express";
import {
  createJob,
  getJob,
  getAllJobs,
  startJob,
  cancelJob
} from "../controllers/job.controller.js";

const router = express.Router();

router.get("/", getAllJobs);
router.post("/", createJob);
router.get("/:jobId", getJob);
router.post("/:jobId/start", startJob);
router.post("/:jobId/cancel", cancelJob);

export default router;
