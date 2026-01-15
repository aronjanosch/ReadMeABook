/**
 * Component: Thumbnail Cache Service Tests
 * Documentation: documentation/integrations/audible.md
 */

import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThumbnailCacheService } from '@/lib/services/thumbnail-cache.service';

const fsMock = vi.hoisted(() => ({
  mkdir: vi.fn(),
  access: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  unlink: vi.fn(),
}));

const axiosMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: fsMock,
  ...fsMock,
}));
vi.mock('axios', () => ({
  default: axiosMock,
  ...axiosMock,
}));

describe('ThumbnailCacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fsMock.mkdir.mockReset();
    fsMock.access.mockReset();
    fsMock.writeFile.mockReset();
    fsMock.readdir.mockReset();
    fsMock.unlink.mockReset();
    axiosMock.get.mockReset();
  });

  it('returns null when missing ASIN or URL', async () => {
    const service = new ThumbnailCacheService();

    expect(await service.cacheThumbnail('', 'http://example.com/x.jpg')).toBeNull();
    expect(await service.cacheThumbnail('ASIN', '')).toBeNull();
  });

  it('returns cached path when file already exists', async () => {
    fsMock.mkdir.mockResolvedValue(undefined);
    fsMock.access.mockResolvedValue(undefined);

    const service = new ThumbnailCacheService();
    const result = await service.cacheThumbnail('ASIN1', 'https://img.example.com/cover.jpg');

    expect(result).toBe(path.join('/app/cache/thumbnails', 'ASIN1.jpg'));
    expect(axiosMock.get).not.toHaveBeenCalled();
  });

  it('skips non-image content types', async () => {
    fsMock.mkdir.mockResolvedValue(undefined);
    fsMock.access.mockRejectedValue(new Error('missing'));
    axiosMock.get.mockResolvedValue({
      headers: { 'content-type': 'text/html' },
      data: Buffer.from('nope'),
    });

    const service = new ThumbnailCacheService();
    const result = await service.cacheThumbnail('ASIN2', 'https://img.example.com/cover.png');

    expect(result).toBeNull();
    expect(fsMock.writeFile).not.toHaveBeenCalled();
  });

  it('downloads and caches image content', async () => {
    fsMock.mkdir.mockResolvedValue(undefined);
    fsMock.access.mockRejectedValue(new Error('missing'));
    axiosMock.get.mockResolvedValue({
      headers: { 'content-type': 'image/jpeg' },
      data: Buffer.from([1, 2, 3]),
    });
    fsMock.writeFile.mockResolvedValue(undefined);

    const service = new ThumbnailCacheService();
    const result = await service.cacheThumbnail('ASIN3', 'https://img.example.com/cover.jpeg');

    expect(result).toBe(path.join('/app/cache/thumbnails', 'ASIN3.jpeg'));
    expect(fsMock.writeFile).toHaveBeenCalled();
  });

  it('deletes thumbnails for a specific ASIN', async () => {
    fsMock.readdir.mockResolvedValue(['ASIN4.jpg', 'ASIN4.png', 'OTHER.jpg']);
    fsMock.unlink.mockResolvedValue(undefined);

    const service = new ThumbnailCacheService();
    await service.deleteThumbnail('ASIN4');

    expect(fsMock.unlink).toHaveBeenCalledTimes(2);
  });

  it('cleans up unused thumbnails', async () => {
    fsMock.mkdir.mockResolvedValue(undefined);
    fsMock.readdir.mockResolvedValue(['KEEP.jpg', 'DROP.jpg']);
    fsMock.unlink.mockResolvedValue(undefined);

    const service = new ThumbnailCacheService();
    const deleted = await service.cleanupUnusedThumbnails(new Set(['KEEP']));

    expect(deleted).toBe(1);
    expect(fsMock.unlink).toHaveBeenCalledTimes(1);
  });

  it('maps cached paths for serving', () => {
    const service = new ThumbnailCacheService();

    expect(service.getCachedPath(null)).toBeNull();
    expect(service.getCachedPath('/app/cache/thumbnails/ASIN.jpg')).toBe('/cache/thumbnails/ASIN.jpg');
  });

  it('exposes the cache directory', () => {
    const service = new ThumbnailCacheService();

    expect(service.getCacheDirectory()).toBe('/app/cache/thumbnails');
  });
});
