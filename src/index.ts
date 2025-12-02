import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import router from './routes';
import { formatUptime } from './utils/uptime';
import { errorHandler } from './middlewares/error.middleware';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const startTime = Date.now();

app.use(cors());
app.use(express.json());

app.use('/api', router);

// Global Error Handler
app.use(errorHandler);

// Health check endpoint
app.get('/healthz', async (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  let dbConnected = false;
  let dbResponseTime = '0ms';

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbResponseTime = `${Date.now() - start}ms`;
    dbConnected = true;
  } catch (e) {
    console.error('Database health check failed', e);
  }

  const memoryUsage = process.memoryUsage();

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
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
    },
    database: {
      connected: dbConnected,
      responseTime: dbResponseTime,
    },
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
