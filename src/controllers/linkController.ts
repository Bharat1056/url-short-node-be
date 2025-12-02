import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

const prisma = new PrismaClient();

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
  const link = await prisma.link.findUnique({
    where: { shortCode: code },
  });

  if (!link) {
    throw new ApiError(404, 'Link not found');
  }

  res.json(new ApiResponse(200, link, "Link stats fetched successfully"));
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

  // Async update click count
  await prisma.link.update({
    where: { shortCode: code },
    data: {
      totalClicks: { increment: 1 },
      lastClicked: new Date(),
    },
  });


  res.redirect(link.targetUrl);
});

