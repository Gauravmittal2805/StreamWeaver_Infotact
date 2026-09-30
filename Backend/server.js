import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fileRoutes from './src/routes/file.routes.js';
import jobRoutes from './src/routes/job.routes.js';
import mappingRoutes from './src/routes/mapping.routes.js';
import transformationRoutes from './src/routes/transformation.routes.js';
import { initWebSocketServer } from './src/services/websocket.service.js';
import { sendErrorResponse } from './src/utils/errors.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing JSON bodies

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'StreamWeaver Backend',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// File, Job, Mapping, and Transformation routes
app.use('/api/files', fileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/transformations', transformationRoutes);

// Global express error handler (Step 5 - Do not expose internal stack traces)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  sendErrorResponse(res, err, 500);
});

// Create HTTP server to attach WebSocket server
const server = http.createServer(app);
initWebSocketServer(server);

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 StreamWeaver Backend is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`⚡ WebSocket endpoint: ws://localhost:${PORT}/ws/jobs`);
  });
}

export { app, server };
export default app;
