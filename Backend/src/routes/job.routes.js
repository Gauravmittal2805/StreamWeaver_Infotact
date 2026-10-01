import express from "express";
import {
  createJob,
  getJob,
  getJobStatus,
  getJobStats,
  getAllJobs,
  startJob,
  cancelJob,
  retryJob
} from "../controllers/job.controller.js";

const router = express.Router();

router.get("/", getAllJobs);
router.post("/", createJob);
router.get("/:jobId", getJob);
router.get("/:jobId/status", getJobStatus);
router.get("/:jobId/stats", getJobStats);
router.post("/:jobId/start", startJob);
router.post("/:jobId/cancel", cancelJob);
router.post("/:jobId/retry", retryJob);

export default router;
