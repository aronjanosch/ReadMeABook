/**
 * Component: Download Torrent Processor Tests
 * Documentation: documentation/backend/services/jobs.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';
import { createJobQueueMock } from '../helpers/job-queue';

const prismaMock = createPrismaMock();
const configMock = vi.hoisted(() => ({ get: vi.fn() }));
const jobQueueMock = createJobQueueMock();
const qbtMock = vi.hoisted(() => ({ addTorrent: vi.fn() }));
const sabMock = vi.hoisted(() => ({ addNZB: vi.fn() }));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/config.service', () => ({
  getConfigService: () => configMock,
}));

vi.mock('@/lib/services/job-queue.service', () => ({
  getJobQueueService: () => jobQueueMock,
}));

vi.mock('@/lib/integrations/qbittorrent.service', () => ({
  getQBittorrentService: () => qbtMock,
}));

vi.mock('@/lib/integrations/sabnzbd.service', () => ({
  getSABnzbdService: () => sabMock,
}));

describe('processDownloadTorrent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const payload = {
    requestId: 'req-1',
    audiobook: { id: 'a1', title: 'Book', author: 'Author' },
    torrent: {
      indexer: 'Indexer',
      title: 'Book - Author',
      size: 50 * 1024 * 1024,
      seeders: 10,
      publishDate: new Date(),
      downloadUrl: 'magnet:?xt=urn:btih:abc',
      guid: 'guid-1',
      format: 'M4B',
    },
    jobId: 'job-1',
  };

  it('routes downloads to qBittorrent by default', async () => {
    configMock.get.mockResolvedValue('qbittorrent');
    qbtMock.addTorrent.mockResolvedValue('hash-1');
    prismaMock.request.update.mockResolvedValue({});
    prismaMock.downloadHistory.create.mockResolvedValue({ id: 'dh-1' });

    const { processDownloadTorrent } = await import('@/lib/processors/download-torrent.processor');
    const result = await processDownloadTorrent(payload);

    expect(result.success).toBe(true);
    expect(qbtMock.addTorrent).toHaveBeenCalled();
    expect(jobQueueMock.addMonitorJob).toHaveBeenCalledWith(
      'req-1',
      'dh-1',
      'hash-1',
      'qbittorrent',
      3
    );
  });

  it('routes downloads to SABnzbd when configured', async () => {
    configMock.get.mockResolvedValue('sabnzbd');
    sabMock.addNZB.mockResolvedValue('nzb-1');
    prismaMock.request.update.mockResolvedValue({});
    prismaMock.downloadHistory.create.mockResolvedValue({ id: 'dh-2' });

    const { processDownloadTorrent } = await import('@/lib/processors/download-torrent.processor');
    const result = await processDownloadTorrent(payload);

    expect(result.success).toBe(true);
    expect(sabMock.addNZB).toHaveBeenCalled();
    expect(jobQueueMock.addMonitorJob).toHaveBeenCalledWith(
      'req-1',
      'dh-2',
      'nzb-1',
      'sabnzbd',
      3
    );
  });
});


