import express from "express";
import cors from "cors";
import jobRoutes from "./routes/job.routes.js";
import fileRoutes from "./routes/file.routes.js";
import mappingRoutes from "./routes/mapping.routes.js";
import transformationRoutes from "./routes/transformation.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoints
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "StreamWeaver Backend",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "StreamWeaver Backend",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// REST Routes
app.use("/api/files", fileRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/mappings", mappingRoutes);
app.use("/api/transformations", transformationRoutes);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
