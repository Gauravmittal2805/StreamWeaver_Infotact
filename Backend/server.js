import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fileRoutes from './src/routes/file.routes.js';
import jobRoutes from './src/routes/job.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing JSON bodies

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'StreamWeaver Backend',
    status: 'running'
  });
});

// File and Job routes
app.use('/api/files', fileRoutes);
app.use('/api/jobs', jobRoutes);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 StreamWeaver Backend is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
