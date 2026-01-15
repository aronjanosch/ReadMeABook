/**
 * Component: Cleanup Seeded Torrents Processor Tests
 * Documentation: documentation/backend/services/scheduler.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

const prismaMock = createPrismaMock();
const configMock = vi.hoisted(() => ({ get: vi.fn() }));
const qbtMock = vi.hoisted(() => ({
  getTorrent: vi.fn(),
  deleteTorrent: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/config.service', () => ({
  getConfigService: () => configMock,
}));

vi.mock('@/lib/integrations/qbittorrent.service', () => ({
  getQBittorrentService: async () => qbtMock,
}));

describe('processCleanupSeededTorrents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips when no indexer configuration is found', async () => {
    configMock.get.mockResolvedValue(null);

    const { processCleanupSeededTorrents } = await import('@/lib/processors/cleanup-seeded-torrents.processor');
    const result = await processCleanupSeededTorrents({ jobId: 'job-1' });

    expect(result.skipped).toBe(true);
    expect(prismaMock.request.findMany).not.toHaveBeenCalled();
  });

  it('hard deletes orphaned SABnzbd requests', async () => {
    configMock.get.mockResolvedValue(
      JSON.stringify([{ name: 'IndexerA', seedingTimeMinutes: 30 }])
    );
    prismaMock.request.findMany.mockResolvedValue([
      {
        id: 'req-1',
        deletedAt: new Date(),
        downloadHistory: [
          {
            selected: true,
            downloadStatus: 'completed',
            indexerName: 'IndexerA',
            nzbId: 'nzb-1',
            torrentHash: null,
          },
        ],
      },
    ]);
    prismaMock.request.delete.mockResolvedValue({});

    const { processCleanupSeededTorrents } = await import('@/lib/processors/cleanup-seeded-torrents.processor');
    const result = await processCleanupSeededTorrents({ jobId: 'job-2' });

    expect(result.success).toBe(true);
    expect(prismaMock.request.delete).toHaveBeenCalledWith({ where: { id: 'req-1' } });
    expect(qbtMock.getTorrent).not.toHaveBeenCalled();
  });

  it('deletes torrents when seeding requirements are met with no shared downloads', async () => {
    configMock.get.mockResolvedValue(
      JSON.stringify([{ name: 'IndexerA', seedingTimeMinutes: 30 }])
    );
    prismaMock.request.findMany
      .mockResolvedValueOnce([
        {
          id: 'req-2',
          deletedAt: null,
          downloadHistory: [
            {
              selected: true,
              downloadStatus: 'completed',
              indexerName: 'IndexerA',
              torrentHash: 'hash-1',
            },
          ],
        },
      ])
      .mockResolvedValueOnce([]);

    qbtMock.getTorrent.mockResolvedValue({
      name: 'Torrent',
      seeding_time: 60 * 40,
    });
    qbtMock.deleteTorrent.mockResolvedValue({});

    const { processCleanupSeededTorrents } = await import('@/lib/processors/cleanup-seeded-torrents.processor');
    const result = await processCleanupSeededTorrents({ jobId: 'job-3' });

    expect(result.cleaned).toBe(1);
    expect(qbtMock.deleteTorrent).toHaveBeenCalledWith('hash-1', true);
  });

  it('keeps shared torrents and deletes soft-deleted request', async () => {
    configMock.get.mockResolvedValue(
      JSON.stringify([{ name: 'IndexerA', seedingTimeMinutes: 10 }])
    );
    prismaMock.request.findMany
      .mockResolvedValueOnce([
        {
          id: 'req-3',
          deletedAt: new Date(),
          downloadHistory: [
            {
              selected: true,
              downloadStatus: 'completed',
              indexerName: 'IndexerA',
              torrentHash: 'hash-2',
            },
          ],
        },
      ])
      .mockResolvedValueOnce([{ id: 'req-4', status: 'downloaded' }]);

    qbtMock.getTorrent.mockResolvedValue({
      name: 'Torrent',
      seeding_time: 60 * 20,
    });
    prismaMock.request.delete.mockResolvedValue({});

    const { processCleanupSeededTorrents } = await import('@/lib/processors/cleanup-seeded-torrents.processor');
    const result = await processCleanupSeededTorrents({ jobId: 'job-4' });

    expect(result.skipped).toBe(1);
    expect(prismaMock.request.delete).toHaveBeenCalledWith({ where: { id: 'req-3' } });
    expect(qbtMock.deleteTorrent).not.toHaveBeenCalled();
  });
});


