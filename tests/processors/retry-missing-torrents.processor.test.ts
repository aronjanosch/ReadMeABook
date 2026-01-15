/**
 * Component: Retry Missing Torrents Processor Tests
 * Documentation: documentation/backend/services/scheduler.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';
import { createJobQueueMock } from '../helpers/job-queue';

const prismaMock = createPrismaMock();
const jobQueueMock = createJobQueueMock();

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/job-queue.service', () => ({
  getJobQueueService: () => jobQueueMock,
}));

describe('processRetryMissingTorrents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues search jobs for awaiting_search requests', async () => {
    prismaMock.request.findMany.mockResolvedValue([
      {
        id: 'req-1',
        audiobook: { id: 'a1', title: 'Book', author: 'Author', audibleAsin: 'ASIN1' },
      },
    ]);

    const { processRetryMissingTorrents } = await import('@/lib/processors/retry-missing-torrents.processor');
    const result = await processRetryMissingTorrents({ jobId: 'job-1' });

    expect(result.success).toBe(true);
    expect(jobQueueMock.addSearchJob).toHaveBeenCalledWith(
      'req-1',
      expect.objectContaining({ id: 'a1', title: 'Book', author: 'Author' })
    );
  });
});


