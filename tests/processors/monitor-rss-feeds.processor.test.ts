/**
 * Component: Monitor RSS Feeds Processor Tests
 * Documentation: documentation/backend/services/scheduler.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';
import { createJobQueueMock } from '../helpers/job-queue';

const prismaMock = createPrismaMock();
const configMock = vi.hoisted(() => ({ get: vi.fn() }));
const jobQueueMock = createJobQueueMock();
const prowlarrMock = vi.hoisted(() => ({ getAllRssFeeds: vi.fn() }));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/config.service', () => ({
  getConfigService: () => configMock,
}));

vi.mock('@/lib/services/job-queue.service', () => ({
  getJobQueueService: () => jobQueueMock,
}));

vi.mock('@/lib/integrations/prowlarr.service', () => ({
  getProwlarrService: () => prowlarrMock,
}));

describe('processMonitorRssFeeds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('matches RSS items and queues search jobs', async () => {
    configMock.get.mockResolvedValue(
      JSON.stringify([{ id: 1, name: 'Indexer', rssEnabled: true }])
    );

    prowlarrMock.getAllRssFeeds.mockResolvedValue([
      { title: 'Great Book - Author Name' },
    ]);

    prismaMock.request.findMany.mockResolvedValue([
      {
        id: 'req-1',
        audiobook: { id: 'a1', title: 'Great Book', author: 'Author Name', audibleAsin: 'ASIN1' },
      },
    ]);

    const { processMonitorRssFeeds } = await import('@/lib/processors/monitor-rss-feeds.processor');
    const result = await processMonitorRssFeeds({ jobId: 'job-1' });

    expect(result.success).toBe(true);
    expect(jobQueueMock.addSearchJob).toHaveBeenCalledWith(
      'req-1',
      expect.objectContaining({ title: 'Great Book', author: 'Author Name' })
    );
  });
});


