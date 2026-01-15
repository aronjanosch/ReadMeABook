/**
 * Component: Admin BookDate API Route Tests
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

describe('Admin BookDate toggle route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authRequest = {
      user: { id: 'admin-1', role: 'admin' },
      json: vi.fn(),
    };
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(authRequest));
    requireAdminMock.mockImplementation((_req: any, handler: any) => handler(authRequest));
  });

  it('toggles BookDate enabled state', async () => {
    authRequest.json.mockResolvedValue({ isEnabled: true });
    prismaMock.bookDateConfig.updateMany.mockResolvedValue({ count: 1 });

    const { PATCH } = await import('@/app/api/admin/bookdate/toggle/route');
    const response = await PATCH({} as any);
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.isEnabled).toBe(true);
    expect(prismaMock.bookDateConfig.updateMany).toHaveBeenCalledWith({ data: { isEnabled: true } });
  });
});


