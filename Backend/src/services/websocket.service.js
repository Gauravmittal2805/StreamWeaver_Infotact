import { WebSocketServer, WebSocket } from 'ws';

let wss = null;
const jobSubscriptions = new Map(); // jobId -> Set<WebSocket>

/**
 * Initializes WebSocket Server attached to express/HTTP server.
 * @param {import('http').Server} server 
 */
export function initWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws/jobs' });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.subscribedJobs = new Set();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe' && data.jobId) {
          ws.subscribedJobs.add(data.jobId);
          if (!jobSubscriptions.has(data.jobId)) {
            jobSubscriptions.set(data.jobId, new Set());
          }
          jobSubscriptions.get(data.jobId).add(ws);
          ws.send(JSON.stringify({ type: 'subscribed', jobId: data.jobId }));
        } else if (data.type === 'unsubscribe' && data.jobId) {
          ws.subscribedJobs.delete(data.jobId);
          if (jobSubscriptions.has(data.jobId)) {
            jobSubscriptions.get(data.jobId).delete(ws);
          }
          ws.send(JSON.stringify({ type: 'unsubscribed', jobId: data.jobId }));
        }
      } catch (err) {
        console.error('[WebSocket] Invalid message received:', err.message);
      }
    });

    ws.on('close', () => {
      for (const jobId of ws.subscribedJobs) {
        if (jobSubscriptions.has(jobId)) {
          jobSubscriptions.get(jobId).delete(ws);
        }
      }
    });
  });

  // Heartbeat interval to clean dead connections
  const pingInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  console.log('⚡ WebSocket Server initialized on path /ws/jobs');
  return wss;
}

/**
 * Broadcasts job progress to all WebSocket clients subscribed to jobId.
 *
 * @param {string} jobId 
 * @param {object} progressData 
 */
export function broadcastJobProgress(jobId, progressData) {
  if (!jobId || !jobSubscriptions.has(jobId)) return;

  const clients = jobSubscriptions.get(jobId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({
    type: 'job_progress',
    jobId,
    timestamp: new Date().toISOString(),
    ...progressData
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export default {
  initWebSocketServer,
  broadcastJobProgress
};
