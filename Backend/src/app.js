import express from "express";
import cors from "cors";
import jobRoutes from "./routes/job.routes.js";
import fileRoutes from "./routes/file.routes.js";
import mappingRoutes from "./routes/mapping.routes.js";
import transformationRoutes from "./routes/transformation.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/jobs", jobRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/mappings", mappingRoutes);
app.use("/api/transformations", transformationRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "StreamWeaver Backend",
    timestamp: new Date().toISOString()
  });
});

export default app;
