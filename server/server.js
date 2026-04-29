import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import noteRoutes from './routes/noteRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// ============ Environment Validation ============
if (!process.env.MONGO_URI) {
  console.error('✗ Error: MONGO_URI not set in .env file');
  process.exit(1);
}

// ============ CORS Configuration (Fixed) ============
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5500',
    process.env.FRONTEND_URL || 'https://your-notes-app.vercel.app',
    'https://your-notes-app.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// ============ Middleware ============
app.use(cors(corsOptions));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ limit: '50kb', extended: true }));

// ============ Enhanced Health Check ============
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  
  res.status(200).json({
    success: true,
    message: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// ============ API Routes ============
app.use('/notes', noteRoutes);

// ============ 404 Handler ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ============ Global Error Handler ============
app.use(errorHandler);

// ============ Graceful Shutdown ============
const gracefulShutdown = (signal) => {
  console.log(`\n✗ Received ${signal}. Closing DB connection...`);
  mongoose.connection.close(false, () => {
    console.log('✓ MongoDB connection closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============ Database Connection & Server Start ============
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API Base: http://localhost:${PORT}/notes`);
      console.log(`✓ Health Check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('✗ Failed to connect to DB and start server:', err.message);
    process.exit(1);
  });

export default app;


