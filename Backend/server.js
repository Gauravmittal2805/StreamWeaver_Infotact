import http from 'node:http';
import dotenv from 'dotenv';
import app from './src/app.js';
import { initWebSocketServer, broadcastJobProgress } from './src/services/websocket.service.js';
import { setBroadcast } from './src/services/etl.service.js';
import { recoverStuckJobs } from './src/services/job.service.js';
import { connectDB } from './src/config/db.js';
import { initDatabaseIndexes } from './src/models/index.js';
import { setJobBroadcast } from './src/services/job.service.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5001;

// ─── HTTP Server & WebSocket ──────────────────────────────────────────────────
const server = http.createServer(app);
const wss = initWebSocketServer(server);

// Register broadcast handler with ETL engine
export function broadcast(jobId, data) {
  broadcastJobProgress(jobId, data);
}

// Register broadcast with ETL and Job services so they can push progress events
setBroadcast(broadcast);
setJobBroadcast(broadcast);

// ─── Start server & job recovery ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      await connectDB();
      await initDatabaseIndexes();
    } catch (err) {
      console.warn('[Server] MongoDB connection deferred or offline mode active:', err.message);
    }

    // Recover any stuck jobs from previous crash/restart (Step 4 & 5)
    await recoverStuckJobs();

    server.listen(PORT, () => {
      console.log(`🚀 StreamWeaver Backend is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
    });
  })();
}

export { app, server, wss };
export default app;
