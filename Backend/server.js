import http from 'node:http';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import fileRoutes from './src/routes/file.routes.js';
import jobRoutes from './src/routes/job.routes.js';
import mappingRoutes from './src/routes/mapping.routes.js';
import transformationRoutes from './src/routes/transformation.routes.js';
import { setBroadcast } from './src/services/etl.service.js';

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

// ─── HTTP Server (needed for WebSocket upgrade) ───────────────────────────────
const server = http.createServer(app);

// ─── WebSocket Server ─────────────────────────────────────────────────────────
// Map<jobId, Set<WebSocket>> — tracks which clients subscribe to which job
const jobSubscribers = new Map();

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  const subscriptions = new Set(); // jobIds this client is subscribed to

  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // Ignore malformed messages
    }

    if (msg.type === 'subscribe' && msg.jobId) {
      const jobId = msg.jobId;
      subscriptions.add(jobId);

      if (!jobSubscribers.has(jobId)) {
        jobSubscribers.set(jobId, new Set());
      }
      jobSubscribers.get(jobId).add(ws);

      // Acknowledge subscription
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'subscribed', jobId }));
      }
    } else if (msg.type === 'ping') {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    }
  });

  ws.on('close', () => {
    // Remove from all job subscription sets
    for (const jobId of subscriptions) {
      const subs = jobSubscribers.get(jobId);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
          jobSubscribers.delete(jobId);
        }
      }
    }
    subscriptions.clear();
  });

  ws.on('error', (err) => {
    console.warn('[WS] Client error:', err.message);
  });
});

// ─── Heartbeat: detect dead connections every 30s ─────────────────────────────
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// ─── Broadcast function ───────────────────────────────────────────────────────
/**
 * Broadcast a message to all WebSocket clients subscribed to a given jobId.
 * @param {string} jobId
 * @param {object} data
 */
export function broadcast(jobId, data) {
  const subs = jobSubscribers.get(jobId);
  if (!subs || subs.size === 0) return;

  const payload = JSON.stringify(data);
  for (const ws of subs) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(payload);
      } catch (err) {
        console.warn(`[WS] Failed to send to client for job ${jobId}:`, err.message);
      }
    }
  }
}

// Register broadcast with ETL service so it can push progress events
setBroadcast(broadcast);

// ─── Start server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 StreamWeaver Backend is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  });
}

export default app;
