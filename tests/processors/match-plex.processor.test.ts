/**
 * Component: Match Library Processor Tests
 * Documentation: documentation/phase3/README.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

const prismaMock = createPrismaMock();
const libraryServiceMock = vi.hoisted(() => ({ searchItems: vi.fn() }));
const configMock = vi.hoisted(() => ({
  getBackendMode: vi.fn(),
  get: vi.fn(),
  getPlexConfig: vi.fn(),
}));
const compareTwoStringsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/library', () => ({
  getLibraryService: async () => libraryServiceMock,
}));

vi.mock('@/lib/services/config.service', () => ({
  getConfigService: () => configMock,
}));

vi.mock('string-similarity', () => ({
  compareTwoStrings: compareTwoStringsMock,
}));

describe('processMatchPlex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes request when no library results are found', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({ libraryId: 'plex-lib' });
    libraryServiceMock.searchItems.mockResolvedValue([]);
    prismaMock.request.update.mockResolvedValue({});

    const { processMatchPlex } = await import('@/lib/processors/match-plex.processor');
    const result = await processMatchPlex({
      requestId: 'req-1',
      audiobookId: 'ab-1',
      title: 'Missing Title',
      author: 'Author',
      jobId: 'job-1',
    });

    expect(result.matched).toBe(false);
    expect(prismaMock.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req-1' },
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
    expect(prismaMock.audiobook.update).not.toHaveBeenCalled();
  });

  it('updates audiobook and request when a high-score match is found (plex)', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({ libraryId: 'plex-lib' });
    libraryServiceMock.searchItems.mockResolvedValue([
      {
        id: 'item-1',
        externalId: 'guid-1',
        title: 'Best Match',
        author: 'Author',
      },
    ]);
    compareTwoStringsMock.mockReturnValue(0.95);
    prismaMock.audiobook.update.mockResolvedValue({});
    prismaMock.request.update.mockResolvedValue({});

    const { processMatchPlex } = await import('@/lib/processors/match-plex.processor');
    const result = await processMatchPlex({
      requestId: 'req-2',
      audiobookId: 'ab-2',
      title: 'Best Match',
      author: 'Author',
      jobId: 'job-2',
    });

    expect(result.matched).toBe(true);
    expect(prismaMock.audiobook.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ab-2' },
        data: expect.objectContaining({ plexGuid: 'guid-1' }),
      })
    );
    expect(prismaMock.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req-2' },
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
  });

  it('uses audiobookshelf IDs when backend mode is audiobookshelf', async () => {
    configMock.getBackendMode.mockResolvedValue('audiobookshelf');
    configMock.get.mockResolvedValue('abs-lib');
    libraryServiceMock.searchItems.mockResolvedValue([
      {
        id: 'item-abs',
        externalId: 'abs-1',
        title: 'Shelf Match',
        author: 'Author',
      },
    ]);
    compareTwoStringsMock.mockReturnValue(0.9);
    prismaMock.audiobook.update.mockResolvedValue({});
    prismaMock.request.update.mockResolvedValue({});

    const { processMatchPlex } = await import('@/lib/processors/match-plex.processor');
    const result = await processMatchPlex({
      requestId: 'req-3',
      audiobookId: 'ab-3',
      title: 'Shelf Match',
      author: 'Author',
      jobId: 'job-3',
    });

    expect(result.matched).toBe(true);
    expect(prismaMock.audiobook.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ absItemId: 'abs-1' }),
      })
    );
  });

  it('completes request without match when score is too low', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({ libraryId: 'plex-lib' });
    libraryServiceMock.searchItems.mockResolvedValue([
      {
        id: 'item-low',
        externalId: 'guid-low',
        title: 'Low Match',
        author: 'Author',
      },
    ]);
    compareTwoStringsMock.mockReturnValue(0.1);
    prismaMock.request.update.mockResolvedValue({});

    const { processMatchPlex } = await import('@/lib/processors/match-plex.processor');
    const result = await processMatchPlex({
      requestId: 'req-4',
      audiobookId: 'ab-4',
      title: 'Low Match',
      author: 'Author',
      jobId: 'job-4',
    });

    expect(result.matched).toBe(false);
    expect(prismaMock.audiobook.update).not.toHaveBeenCalled();
    expect(prismaMock.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
  });

  it('marks request completed with error when matching fails', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({ libraryId: null });
    prismaMock.request.update.mockResolvedValue({});

    const { processMatchPlex } = await import('@/lib/processors/match-plex.processor');
    const result = await processMatchPlex({
      requestId: 'req-5',
      audiobookId: 'ab-5',
      title: 'Error Title',
      author: 'Author',
      jobId: 'job-5',
    });

    expect(result.success).toBe(false);
    expect(prismaMock.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
  });
});


