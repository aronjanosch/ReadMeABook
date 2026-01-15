/**
 * Component: Admin Login API Route Tests
 * Documentation: documentation/backend/services/auth.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

const prismaMock = createPrismaMock();
const bcryptMock = {
  compare: vi.fn(),
};
const encryptionMock = {
  decrypt: vi.fn(),
};
const tokenMock = {
  generateAccessToken: vi.fn(() => 'access-token'),
  generateRefreshToken: vi.fn(() => 'refresh-token'),
};

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('bcrypt', () => ({
  default: bcryptMock,
  ...bcryptMock,
}));

vi.mock('@/lib/services/encryption.service', () => ({
  getEncryptionService: () => encryptionMock,
}));

vi.mock('@/lib/utils/jwt', () => ({
  generateAccessToken: tokenMock.generateAccessToken,
  generateRefreshToken: tokenMock.generateRefreshToken,
}));

const makeRequest = (body: Record<string, any>) => ({
  json: vi.fn().mockResolvedValue(body),
});

describe('Admin login route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISABLE_LOCAL_LOGIN;
  });

  it('blocks local login when disabled', async () => {
    process.env.DISABLE_LOCAL_LOGIN = 'true';
    const { POST } = await import('@/app/api/auth/admin/login/route');

    const response = await POST(makeRequest({ username: 'admin', password: 'pass' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('Local login is disabled');
  });

  it('rejects missing credentials', async () => {
    const { POST } = await import('@/app/api/auth/admin/login/route');

    const response = await POST(makeRequest({ username: 'admin' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('ValidationError');
  });

  it('rejects unknown user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/auth/admin/login/route');

    const response = await POST(makeRequest({ username: 'admin', password: 'pass' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('AuthenticationError');
  });

  it('rejects invalid password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      plexId: 'local-admin',
      plexUsername: 'admin',
      plexEmail: null,
      role: 'admin',
      avatarUrl: null,
      authToken: 'enc-hash',
    });
    encryptionMock.decrypt.mockReturnValue('hash');
    bcryptMock.compare.mockResolvedValue(false);
    const { POST } = await import('@/app/api/auth/admin/login/route');

    const response = await POST(makeRequest({ username: 'admin', password: 'wrong' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('AuthenticationError');
  });

  it('rejects when password verification throws', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-2',
      plexId: 'local-admin',
      plexUsername: 'admin',
      plexEmail: null,
      role: 'admin',
      avatarUrl: null,
      authToken: 'enc-hash',
    });
    encryptionMock.decrypt.mockImplementation(() => {
      throw new Error('decrypt failed');
    });
    const { POST } = await import('@/app/api/auth/admin/login/route');

    const response = await POST(makeRequest({ username: 'admin', password: 'pass' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('AuthenticationError');
  });

  it('returns tokens for valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-3',
      plexId: 'local-admin',
      plexUsername: 'admin',
      plexEmail: 'admin@example.com',
      role: 'admin',
      avatarUrl: null,
      authToken: 'enc-hash',
    });
    prismaMock.user.update.mockResolvedValue({});
    encryptionMock.decrypt.mockReturnValue('hash');
    bcryptMock.compare.mockResolvedValue(true);
    const { POST } = await import('@/app/api/auth/admin/login/route');

    const response = await POST(makeRequest({ username: 'admin', password: 'pass' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.accessToken).toBe('access-token');
    expect(payload.refreshToken).toBe('refresh-token');
    expect(prismaMock.user.update).toHaveBeenCalled();
  });
});
