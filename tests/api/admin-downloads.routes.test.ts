/**
 * Component: Admin Downloads API Route Tests
 * Documentation: documentation/testing.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

let authRequest: any;

const prismaMock = createPrismaMock();
const requireAuthMock = vi.hoisted(() => vi.fn());
const requireAdminMock = vi.hoisted(() => vi.fn());
const configServiceMock = vi.hoisted(() => ({ get: vi.fn() }));
const qbittorrentMock = vi.hoisted(() => ({ getTorrent: vi.fn() }));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: requireAuthMock,
  requireAdmin: requireAdminMock,
}));

vi.mock('@/lib/services/config.service', () => ({
  getConfigService: () => configServiceMock,
}));

vi.mock('@/lib/integrations/qbittorrent.service', () => ({
  getQBittorrentService: async () => qbittorrentMock,
}));

vi.mock('@/lib/integrations/sabnzbd.service', () => ({
  getSABnzbdService: async () => ({ getNZB: vi.fn() }),
}));

describe('Admin downloads route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authRequest = { user: { id: 'admin-1', role: 'admin' } };
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(authRequest));
    requireAdminMock.mockImplementation((_req: any, handler: any) => handler());
  });

  it('returns formatted active downloads', async () => {
    prismaMock.request.findMany.mockResolvedValueOnce([
      {
        id: 'req-1',
        status: 'downloading',
        progress: 50,
        updatedAt: new Date(),
        audiobook: { title: 'Title', author: 'Author' },
        user: { plexUsername: 'user' },
        downloadHistory: [{ torrentHash: 'hash', torrentName: 'Torrent', downloadStatus: 'downloading' }],
      },
    ]);
    configServiceMock.get.mockResolvedValueOnce('qbittorrent');
    qbittorrentMock.getTorrent.mockResolvedValueOnce({ dlspeed: 123, eta: 60 });

    const { GET } = await import('@/app/api/admin/downloads/active/route');
    const response = await GET({} as any);
    const payload = await response.json();

    expect(payload.downloads[0].speed).toBe(123);
    expect(payload.downloads[0].torrentName).toBe('Torrent');
  });
});


