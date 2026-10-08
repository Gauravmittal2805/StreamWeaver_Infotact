import express from "express";
import {
  createJob,
  getJob,
  getJobStatus,
  getJobStats,
  getJobFailedRecords,
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
router.get("/:jobId/failed", getJobFailedRecords);
router.get("/:jobId/failed-records", getJobFailedRecords);
router.get("/:jobId/errors", getJobFailedRecords);
router.post("/:jobId/start", startJob);
router.post("/:jobId/cancel", cancelJob);
router.post("/:jobId/retry", retryJob);

export default router;
