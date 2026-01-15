/**
 * Component: Request With Torrent API Route Tests
 * Documentation: documentation/testing.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

let authRequest: any;

const requireAuthMock = vi.hoisted(() => vi.fn());
const prismaMock = createPrismaMock();
const jobQueueMock = vi.hoisted(() => ({
  addDownloadJob: vi.fn(),
}));
const findPlexMatchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/job-queue.service', () => ({
  getJobQueueService: () => jobQueueMock,
}));

vi.mock('@/lib/utils/audiobook-matcher', () => ({
  findPlexMatch: findPlexMatchMock,
}));

describe('Request with torrent route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authRequest = {
      user: { id: 'user-1', role: 'user' },
      json: vi.fn(),
    };
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(authRequest));
  });

  it('returns 409 when audiobook is already being processed', async () => {
    authRequest.json.mockResolvedValue({
      audiobook: { asin: 'ASIN', title: 'Title', author: 'Author' },
      torrent: { guid: 'guid', title: 'Torrent', size: 100, indexer: 'Indexer', downloadUrl: 'url', publishDate: '2024-01-01' },
    });
    prismaMock.request.findFirst.mockResolvedValueOnce({
      id: 'req-1',
      status: 'downloaded',
      userId: 'user-2',
      user: { plexUsername: 'other' },
    });

    const { POST } = await import('@/app/api/audiobooks/request-with-torrent/route');
    const response = await POST({} as any);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe('BeingProcessed');
  });

  it('creates request and queues download job', async () => {
    authRequest.json.mockResolvedValue({
      audiobook: { asin: 'ASIN', title: 'Title', author: 'Author' },
      torrent: { guid: 'guid', title: 'Torrent', size: 100, indexer: 'Indexer', downloadUrl: 'url', publishDate: '2024-01-01' },
    });
    prismaMock.request.findFirst.mockResolvedValueOnce(null);
    findPlexMatchMock.mockResolvedValueOnce(null);
    prismaMock.audiobook.findFirst.mockResolvedValueOnce(null);
    prismaMock.audiobook.create.mockResolvedValueOnce({ id: 'ab-1', title: 'Title', author: 'Author', audibleAsin: 'ASIN' });
    prismaMock.request.findFirst.mockResolvedValueOnce(null);
    prismaMock.request.create.mockResolvedValueOnce({
      id: 'req-2',
      audiobook: { id: 'ab-1', title: 'Title', author: 'Author' },
      user: { id: 'user-1', plexUsername: 'user' },
    });

    const { POST } = await import('@/app/api/audiobooks/request-with-torrent/route');
    const response = await POST({} as any);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(jobQueueMock.addDownloadJob).toHaveBeenCalledWith('req-2', {
      id: 'ab-1',
      title: 'Title',
      author: 'Author',
    }, expect.objectContaining({ guid: 'guid' }));
  });
});


