import http from 'node:http';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fileRoutes from './src/routes/file.routes.js';
import jobRoutes from './src/routes/job.routes.js';
import mappingRoutes from './src/routes/mapping.routes.js';
import transformationRoutes from './src/routes/transformation.routes.js';
import { initWebSocketServer, broadcastJobProgress } from './src/services/websocket.service.js';
import { sendErrorResponse } from './src/utils/errors.js';
import { setBroadcast } from './src/services/etl.service.js';
import { recoverStuckJobs } from './src/services/job.service.js';
import { connectDB } from './src/config/db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'StreamWeaver Backend',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ─── REST Routes ──────────────────────────────────────────────────────────────
app.use('/api/files', fileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/transformations', transformationRoutes);

// ─── HTTP Server & WebSocket ──────────────────────────────────────────────────
const server = http.createServer(app);
const wss = initWebSocketServer(server);

// Register broadcast handler with ETL engine
export function broadcast(jobId, data) {
  broadcastJobProgress(jobId, data);
}
setBroadcast(broadcast);

// ─── Start server & job recovery ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      if (process.env.MONGO_URI) {
        await connectDB();
      }
    } catch (err) {
      console.warn('[Server] MongoDB connection deferred or offline mode active:', err.message);
    }

    // Recover any stuck jobs from previous crash/restart (Step 4)
    await recoverStuckJobs();

    server.listen(PORT, () => {
      console.log(`🚀 StreamWeaver Backend is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
    });
  })();
}

export { app, server };
export default app;
