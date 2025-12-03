import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './utils/prisma';
import router from './routes';
import { formatUptime } from './utils/uptime';
import { errorHandler } from './middlewares/error.middleware';

import { startUptimeMonitor } from './jobs/uptimeMonitor';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const startTime = Date.now();

// Start the uptime monitor
startUptimeMonitor();

app.use(cors({
  origin: 'https://url-shortener-node-pied.vercel.app/**',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.use('/api', router);

// Global Error Handler
app.use(errorHandler);

// Health check endpoint
app.get('/healthz', async (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const checkDb = async () => {
    try {
      const start = Date.now();
      await prisma.$queryRawUnsafe('SELECT 1');
      return {
        connected: true,
        responseTime: `${Date.now() - start}ms`
      };
    } catch {
      return {
        connected: false,
        responseTime: '0ms'
      };
    }
  };

  const db = await checkDb();

  res.json({
    ok: true,
    version: '1.0.0',
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds),
      startTime: new Date(startTime).toISOString(),
    },
    system: {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      memoryUsage: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
    },
    database: db,
  });
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
