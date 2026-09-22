import express from "express";
import {
  createJob,
  getJob,
  startJob
} from "../controllers/job.controller.js";

const router = express.Router();

router.post("/", createJob);
router.get("/:jobId", getJob);
router.post("/:jobId/start", startJob);

export default router;
