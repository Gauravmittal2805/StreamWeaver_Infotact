const express = require("express");
const {
  createJob,
  getJob
} = require("../controllers/job.controller");

const router = express.Router();

router.post("/", createJob);
router.get("/:jobId", getJob);

module.exports = router;
