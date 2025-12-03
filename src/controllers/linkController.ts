import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

export const createLink = asyncHandler(async (req: Request, res: Response) => {
  const { targetUrl, customCode } = req.body;

  if (!targetUrl) {
    throw new ApiError(400, 'Target URL is required');
  }

  let shortCode = customCode;
  if (!shortCode) {
    shortCode = Math.random().toString(36).substring(2, 8);
  }

  const existing = await prisma.link.findUnique({
    where: { shortCode },
  });

  if (existing) {
    throw new ApiError(409, 'Short code already exists');
  }

  const link = await prisma.link.create({
    data: {
      targetUrl,
      shortCode,
    },
  });

  res.status(201).json(new ApiResponse(201, link, "Link created successfully"));
});

export const getLinks = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || '';

  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { shortCode: { contains: search, mode: 'insensitive' as const } },
          { targetUrl: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        uptimeChecks: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    prisma.link.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json(
    new ApiResponse(
      200,
      {
        data: links,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
      "Links fetched successfully"
    )
  );
});

export const getLinkStats = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  let link = await prisma.link.findUnique({
    where: { shortCode: code },
  });

  if (!link) {
    throw new ApiError(404, 'Link not found');
  }

  // 1. Perform immediate uptime check
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
    await prisma.uptimeCheck.create({
      data: {
        linkId: link.id,
        status: 'DOWN',
      },
    });
  }

  const linkWithData = await prisma.link.findUnique({
    where: { shortCode: code },
    include: {
      clicks: {
        orderBy: { createdAt: 'asc' },
      },
      uptimeChecks: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!linkWithData) {
     throw new ApiError(404, 'Link not found');
  }

  // 3. Aggregate daily uptime
  const dailyStats = new Map<string, { total: number; up: number }>();

  // Initialize last 7 days with 0
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyStats.set(dateStr, { total: 0, up: 0 });
  }

  linkWithData.uptimeChecks.forEach((check) => {
    const dateStr = check.createdAt.toISOString().split('T')[0];
    if (dailyStats.has(dateStr)) {
      const stats = dailyStats.get(dateStr)!;
      stats.total++;
      if (check.status === 'UP') {
        stats.up++;
      }
    }
  });

  const dailyUptime = Array.from(dailyStats.entries())
    .map(([date, stats]) => ({
      date,
      uptimePercentage: stats.total > 0 ? Math.round((stats.up / stats.total) * 100) : 0,
      totalChecks: stats.total,
      upChecks: stats.up,
      downChecks: stats.total - stats.up,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Limit uptimeChecks in response to last 50 to keep payload small, but we used all for aggregation
  const responseData = {
    ...linkWithData,
    uptimeChecks: linkWithData.uptimeChecks.slice(0, 50),
    dailyUptime,
  };

  res.json(new ApiResponse(200, responseData, "Link stats fetched successfully"));
});

export const deleteLink = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    await prisma.link.delete({
      where: { shortCode: code },
    });
  } catch (error) {
    // Prisma throws an error if record not found
    throw new ApiError(404, "Link not found or already deleted");
  }

  res.status(200).json(new ApiResponse(200, null, "Link deleted successfully"));
});

export const redirectLink = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const link = await prisma.link.findUnique({
    where: { shortCode: code },
  });

  if (!link) {
    throw new ApiError(404, 'Link not found');
  }

  // Async update click count and create click record
  await prisma.$transaction([
    prisma.link.update({
      where: { shortCode: code },
      data: {
        totalClicks: { increment: 1 },
        lastClicked: new Date(),
      },
    }),
    prisma.click.create({
      data: {
        linkId: link.id,
      },
    }),
  ]);


  res.redirect(link.targetUrl);
});

