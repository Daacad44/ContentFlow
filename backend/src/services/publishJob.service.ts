/**
 * src/services/publishJob.service.ts
 * Tracks publish jobs and structured publishing logs in the database.
 */
import { PublishJobStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';

const jobInclude = {
  post: {
    select: {
      id: true,
      content: true,
      status: true,
      scheduledAt: true,
    },
  },
  logs: { orderBy: { createdAt: 'asc' as const }, take: 50 },
};

function toJobDto(job: Prisma.PublishJobGetPayload<{ include: typeof jobInclude }>) {
  return {
    id: job.id,
    postId: job.postId,
    workspaceId: job.workspaceId,
    bullJobId: job.bullJobId,
    status: job.status,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    scheduledFor: job.scheduledFor,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    post: job.post,
    logs: job.logs.map((l: { id: string; level: string; message: string; metadata: unknown; createdAt: Date }) => ({
      id: l.id,
      level: l.level,
      message: l.message,
      metadata: l.metadata,
      createdAt: l.createdAt,
    })),
  };
}

export const publishJobService = {
  async create(params: {
    postId: string;
    workspaceId: string;
    scheduledFor?: Date | null;
    bullJobId?: string;
  }) {
    const job = await prisma.publishJob.create({
      data: {
        postId: params.postId,
        workspaceId: params.workspaceId,
        bullJobId: params.bullJobId ?? null,
        scheduledFor: params.scheduledFor ?? null,
        status: params.scheduledFor ? PublishJobStatus.DELAYED : PublishJobStatus.QUEUED,
        maxAttempts: 3,
      },
      include: jobInclude,
    });

    await this.addLog(job.id, 'info', 'Publish job created', {
      scheduledFor: params.scheduledFor?.toISOString(),
    });

    return toJobDto(job);
  },

  async addLog(
    publishJobId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await prisma.publishLog.create({
      data: { publishJobId, level, message, metadata },
    });
  },

  async updateStatus(
    publishJobId: string,
    status: PublishJobStatus,
    extra?: {
      attempt?: number;
      errorMessage?: string | null;
      startedAt?: Date;
      completedAt?: Date;
      bullJobId?: string;
    },
  ) {
    return prisma.publishJob.update({
      where: { id: publishJobId },
      data: { status, ...extra },
    });
  },

  async list(
    workspaceId: string,
    query: { status?: PublishJobStatus; page: number; limit: number },
  ) {
    const where: Prisma.PublishJobWhereInput = { workspaceId };
    if (query.status) where.status = query.status;

    const [jobs, total] = await Promise.all([
      prisma.publishJob.findMany({
        where,
        include: jobInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.publishJob.count({ where }),
    ]);

    return {
      jobs: jobs.map(toJobDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async get(workspaceId: string, jobId: string) {
    const job = await prisma.publishJob.findFirst({
      where: { id: jobId, workspaceId },
      include: {
        ...jobInclude,
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!job) throw ApiError.notFound('Publish job not found.');
    return toJobDto(job);
  },

  async getLogs(workspaceId: string, jobId: string) {
    const job = await prisma.publishJob.findFirst({
      where: { id: jobId, workspaceId },
      select: { id: true },
    });
    if (!job) throw ApiError.notFound('Publish job not found.');

    const logs = await prisma.publishLog.findMany({
      where: { publishJobId: jobId },
      orderBy: { createdAt: 'asc' },
    });

    return logs;
  },

  async findByPostId(postId: string) {
    return prisma.publishJob.findFirst({
      where: { postId, status: { in: [PublishJobStatus.QUEUED, PublishJobStatus.DELAYED, PublishJobStatus.ACTIVE] } },
      orderBy: { createdAt: 'desc' },
    });
  },
};
