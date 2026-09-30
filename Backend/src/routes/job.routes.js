import express from "express";
import {
  createJob,
  getJob,
  getAllJobs,
  startJob
} from "../controllers/job.controller.js";

const router = express.Router();

router.get("/", getAllJobs);
router.post("/", createJob);
router.get("/:jobId", getJob);
router.post("/:jobId/start", startJob);

export default router;
