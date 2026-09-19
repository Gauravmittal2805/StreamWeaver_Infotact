const express = require("express");
const cors = require("cors");
const jobRoutes = require("./routes/job.routes");
const fileRoutes = require("./routes/file.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/jobs", jobRoutes);
app.use("/api/files", fileRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "StreamWeaver Backend",
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
