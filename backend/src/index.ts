import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import folderRoutes from './routes/folders.js';
import noteRoutes from './routes/notes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(
  cors({
    origin: '*', // Allow all for simplified deployment setup
    credentials: true,
  })
);

app.use(express.json());

// Simple ping — use this URL in UptimeRobot to keep server awake
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Detailed health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/notes', noteRoutes);

// General fallback error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

// Start the server locally (Vercel will ignore this and use the exported app)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

// Export for Vercel Serverless Functions
export default app;
