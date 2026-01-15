/**
 * Component: Admin Requests API Route Tests
 * Documentation: documentation/testing.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

let authRequest: any;

const prismaMock = createPrismaMock();
const requireAuthMock = vi.hoisted(() => vi.fn());
const requireAdminMock = vi.hoisted(() => vi.fn());
const deleteRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: requireAuthMock,
  requireAdmin: requireAdminMock,
}));

vi.mock('@/lib/services/request-delete.service', () => ({
  deleteRequest: deleteRequestMock,
}));

describe('Admin requests routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authRequest = { user: { id: 'admin-1', role: 'admin' } };
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(authRequest));
    requireAdminMock.mockImplementation((_req: any, handler: any) => handler());
  });

  it('returns recent requests', async () => {
    prismaMock.request.findMany.mockResolvedValueOnce([
      {
        id: 'req-1',
        status: 'pending',
        createdAt: new Date(),
        completedAt: null,
        errorMessage: null,
        audiobook: { title: 'Title', author: 'Author' },
        user: { plexUsername: 'user' },
        downloadHistory: [{ torrentUrl: 'http://torrent' }],
      },
    ]);

    const { GET } = await import('@/app/api/admin/requests/recent/route');
    const response = await GET({} as any);
    const payload = await response.json();

    expect(payload.requests).toHaveLength(1);
    expect(payload.requests[0].torrentUrl).toBe('http://torrent');
  });

  it('soft deletes a request via delete service', async () => {
    deleteRequestMock.mockResolvedValueOnce({
      success: true,
      message: 'Deleted',
      filesDeleted: 1,
      torrentsRemoved: 0,
      torrentsKeptSeeding: 0,
      torrentsKeptUnlimited: 0,
    });

    const { DELETE } = await import('@/app/api/admin/requests/[id]/route');
    const response = await DELETE({} as any, { params: Promise.resolve({ id: 'req-1' }) });
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(deleteRequestMock).toHaveBeenCalledWith('req-1', 'admin-1');
  });
});


