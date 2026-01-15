/**
 * Component: Admin Logs API Route Tests
 * Documentation: documentation/testing.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

let authRequest: any;

const prismaMock = createPrismaMock();
const requireAuthMock = vi.hoisted(() => vi.fn());
const requireAdminMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: requireAuthMock,
  requireAdmin: requireAdminMock,
}));

describe('Admin logs route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authRequest = { user: { id: 'admin-1', role: 'admin' } };
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(authRequest));
    requireAdminMock.mockImplementation((_req: any, handler: any) => handler());
  });

  it('returns paginated logs', async () => {
    prismaMock.job.findMany.mockResolvedValueOnce([{ id: 'job-1' }]);
    prismaMock.job.count.mockResolvedValueOnce(1);

    const { GET } = await import('@/app/api/admin/logs/route');
    const response = await GET({ url: 'http://localhost/api/admin/logs?page=1&limit=10' } as any);
    const payload = await response.json();

    expect(payload.logs).toHaveLength(1);
    expect(payload.pagination.total).toBe(1);
  });
});


