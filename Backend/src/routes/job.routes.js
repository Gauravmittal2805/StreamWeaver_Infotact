const express = require("express");
const {
  createJob,
  getJob,
  startJob
} = require("../controllers/job.controller");

const router = express.Router();

router.post("/", createJob);
router.get("/:jobId", getJob);
router.post("/:jobId/start", startJob);

module.exports = router;

