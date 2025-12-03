import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const checkUptime = async () => {
  console.log('Starting uptime check...');

  try {
    const links = await prisma.link.findMany();

    for (const link of links) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(link.targetUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const status = response.ok ? 'UP' : 'DOWN';

        await prisma.uptimeCheck.create({
          data: {
            linkId: link.id,
            status,
          },
        });
      } catch (error) {
        // If fetch fails (network error, timeout, etc.), consider it DOWN
        await prisma.uptimeCheck.create({
          data: {
            linkId: link.id,
            status: 'DOWN',
          },
        });
      }
    }

    console.log(`Uptime check completed for ${links.length} links.`);
  } catch (error) {
    console.error('Error in uptime monitor:', error);
  }
};

export const startUptimeMonitor = () => {
  console.log('Initializing uptime monitor...');

  // Run immediately on startup
  checkUptime();

  // Schedule task to run every hour
  cron.schedule('0 * * * *', () => {
    checkUptime();
  });
};
