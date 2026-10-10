import { WebSocketServer, WebSocket } from 'ws';

let wss = null;
const jobSubscriptions = new Map(); // jobId -> Set<WebSocket>

/**
 * Initializes WebSocket Server attached to express/HTTP server.
 * @param {import('http').Server} server 
 */
export function initWebSocketServer(serverOptions) {
  if (wss) return wss;

  const server = serverOptions && serverOptions.listen ? serverOptions : (serverOptions && serverOptions.server ? serverOptions.server : serverOptions);

  try {
    wss = new WebSocketServer({ server, path: '/ws' });
  } catch (err) {
    console.warn('[WebSocket] Warning: Failed to bind to path /ws:', err.message);
    return null;
  }

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.subscribedJobs = new Set();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe' && data.jobId) {
          ws.subscribedJobs.add(data.jobId);
          if (!jobSubscriptions.has(data.jobId)) {
            jobSubscriptions.set(data.jobId, new Set());
          }
          jobSubscriptions.get(data.jobId).add(ws);
          ws.send(JSON.stringify({ type: 'subscribed', jobId: data.jobId }));

          // Send current job state snapshot immediately if available to restore progress
          try {
            const { getJob } = await import('./job.service.js');
            const job = await getJob(data.jobId);
            if (job && ws.readyState === WebSocket.OPEN) {
              const snapshotPayload = {
                jobId: data.jobId,
                status: job.status,
                totalRows: job.totalRows || 0,
                processedRows: job.processedRows || 0,
                successfulRows: job.successfulRows || 0,
                failedRows: job.failedRows || 0,
                rowsPerSecond: job.rowsPerSecond || 0,
                progressPercent: job.progressPercent || 0,
                errors: job.errors || [],
                timestamp: new Date().toISOString()
              };
              // Send snapshot event
              ws.send(JSON.stringify({ type: 'snapshot', ...snapshotPayload }));
              // Also send progress event so subscribers listening to progress restore seamlessly
              ws.send(JSON.stringify({ type: 'progress', isSnapshot: true, ...snapshotPayload }));
            }
          } catch {
            // Ignore snapshot fetch error
          }
        } else if (data.type === 'unsubscribe' && data.jobId) {
          ws.subscribedJobs.delete(data.jobId);
          if (jobSubscriptions.has(data.jobId)) {
            jobSubscriptions.get(data.jobId).delete(ws);
          }
          ws.send(JSON.stringify({ type: 'unsubscribed', jobId: data.jobId }));
        } else if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (err) {
        console.error('[WebSocket] Invalid message received:', err.message);
      }
    });

    ws.on('close', () => {
      for (const jobId of ws.subscribedJobs) {
        if (jobSubscriptions.has(jobId)) {
          jobSubscriptions.get(jobId).delete(ws);
          if (jobSubscriptions.get(jobId).size === 0) {
            jobSubscriptions.delete(jobId);
          }
        }
      }
      ws.subscribedJobs.clear();
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket] Client error:', err.message);
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
    wss = null;
  });

  console.log('⚡ WebSocket Server initialized on path /ws');
  return wss;
}

/**
 * Broadcasts job progress strictly to WebSocket clients subscribed to that specific jobId.
 * Ensures updates from Job A never leak to Job B's dashboard.
 *
 * @param {string} jobId 
 * @param {object} progressData 
 */
export function broadcastJobProgress(jobId, progressData) {
  if (!jobId || !jobSubscriptions.has(jobId)) return;

  const clients = jobSubscriptions.get(jobId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({
    type: progressData.type || 'progress',
    jobId,
    timestamp: new Date().toISOString(),
    ...progressData
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.warn(`[WebSocket] Send error for job ${jobId}:`, err.message);
      }
    }
  }
}

export default {
  initWebSocketServer,
  broadcastJobProgress
};
