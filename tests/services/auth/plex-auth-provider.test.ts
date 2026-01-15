/**
 * Component: Plex Auth Provider Tests
 * Documentation: documentation/backend/services/auth.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../../helpers/prisma';

const prismaMock = createPrismaMock();
const configMock = vi.hoisted(() => ({
  getPlexConfig: vi.fn(),
}));
const encryptionMock = vi.hoisted(() => ({
  encrypt: vi.fn((value: string) => `enc:${value}`),
  decrypt: vi.fn((value: string) => value.replace('enc:', '')),
}));
const plexServiceMock = vi.hoisted(() => ({
  requestPin: vi.fn(),
  getOAuthUrl: vi.fn(),
  checkPin: vi.fn(),
  getUserInfo: vi.fn(),
  verifyServerAccess: vi.fn(),
  getHomeUsers: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/config.service', () => ({
  getConfigService: () => configMock,
}));

vi.mock('@/lib/services/encryption.service', () => ({
  getEncryptionService: () => encryptionMock,
}));

vi.mock('@/lib/integrations/plex.service', () => ({
  getPlexService: () => plexServiceMock,
}));

describe('PlexAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initiates login and returns OAuth URL', async () => {
    process.env.PLEX_OAUTH_CALLBACK_URL = 'http://app/callback';
    plexServiceMock.requestPin.mockResolvedValue({ id: 42, code: 'CODE' });
    plexServiceMock.getOAuthUrl.mockReturnValue('http://plex/oauth');

    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const result = await provider.initiateLogin();

    expect(result.redirectUrl).toBe('http://plex/oauth');
    expect(result.pinId).toBe('42');
  });

  it('returns error when PIN authorization is still pending', async () => {
    plexServiceMock.checkPin.mockResolvedValue(null);

    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const result = await provider.handleCallback({ pinId: '123' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/waiting for user authorization/i);
  });

  it('returns error when pinId is missing', async () => {
    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const result = await provider.handleCallback({});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/missing pin id/i);
  });

  it('returns error when Plex server is not configured', async () => {
    plexServiceMock.checkPin.mockResolvedValue('token');
    plexServiceMock.getUserInfo.mockResolvedValue({
      id: 1,
      username: 'user',
      authToken: 'token',
    });
    configMock.getPlexConfig.mockResolvedValue({
      serverUrl: null,
      authToken: 'token',
      libraryId: null,
      machineIdentifier: null,
    });

    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const result = await provider.handleCallback({ pinId: '123' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/plex server is not configured/i);
  });

  it('returns profile selection when multiple home users are present', async () => {
    plexServiceMock.checkPin.mockResolvedValue('token');
    plexServiceMock.getUserInfo.mockResolvedValue({
      id: 1,
      username: 'user',
      authToken: 'token',
    });
    configMock.getPlexConfig.mockResolvedValue({
      serverUrl: 'http://plex',
      authToken: 'token',
      libraryId: 'lib',
      machineIdentifier: 'machine',
    });
    plexServiceMock.verifyServerAccess.mockResolvedValue(true);
    plexServiceMock.getHomeUsers.mockResolvedValue([
      { id: '1', title: 'User 1' },
      { id: '2', title: 'User 2' },
    ]);

    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const result = await provider.handleCallback({ pinId: '123' });

    expect(result.success).toBe(true);
    expect(result.requiresProfileSelection).toBe(true);
    expect(result.profiles?.length).toBe(2);
  });

  it('denies login when server access check fails', async () => {
    plexServiceMock.checkPin.mockResolvedValue('token');
    plexServiceMock.getUserInfo.mockResolvedValue({
      id: 1,
      username: 'user',
      authToken: 'token',
    });
    configMock.getPlexConfig.mockResolvedValue({
      serverUrl: 'http://plex',
      authToken: 'token',
      libraryId: 'lib',
      machineIdentifier: 'machine',
    });
    plexServiceMock.verifyServerAccess.mockResolvedValue(false);

    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const result = await provider.handleCallback({ pinId: '123' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/do not have access/i);
  });

  it('creates user and returns tokens when auth succeeds', async () => {
    plexServiceMock.checkPin.mockResolvedValue('token');
    plexServiceMock.getUserInfo.mockResolvedValue({
      id: 1,
      username: 'user',
      email: 'user@example.com',
      thumb: 'avatar',
      authToken: 'token',
    });
    configMock.getPlexConfig.mockResolvedValue({
      serverUrl: 'http://plex',
      authToken: 'token',
      libraryId: 'lib',
      machineIdentifier: 'machine',
    });
    plexServiceMock.verifyServerAccess.mockResolvedValue(true);
    plexServiceMock.getHomeUsers.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.upsert.mockResolvedValue({
      id: 'user-1',
      plexUsername: 'user',
      plexEmail: 'user@example.com',
      avatarUrl: 'avatar',
      role: 'user',
    });

    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const result = await provider.handleCallback({ pinId: '123' });

    expect(result.success).toBe(true);
    expect(result.tokens?.accessToken).toBeTruthy();
    expect(result.user?.authProvider).toBe('plex');
  });

  it('returns false when access validation has no server config', async () => {
    configMock.getPlexConfig.mockResolvedValue({
      serverUrl: null,
      machineIdentifier: null,
    });

    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const ok = await provider.validateAccess({ id: 'user-1', username: 'user', isAdmin: false, authProvider: 'plex' });

    expect(ok).toBe(false);
  });

  it('returns false when Plex auth token is missing in the database', async () => {
    configMock.getPlexConfig.mockResolvedValue({
      serverUrl: 'http://plex',
      machineIdentifier: 'machine',
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', authToken: null });

    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const ok = await provider.validateAccess({ id: 'user-1', username: 'user', isAdmin: false, authProvider: 'plex' });

    expect(ok).toBe(false);
  });

  it('decrypts tokens and verifies server access', async () => {
    configMock.getPlexConfig.mockResolvedValue({
      serverUrl: 'http://plex',
      machineIdentifier: 'machine',
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', authToken: 'enc:token' });
    plexServiceMock.verifyServerAccess.mockResolvedValue(true);

    const { PlexAuthProvider } = await import('@/lib/services/auth/PlexAuthProvider');
    const provider = new PlexAuthProvider();
    const ok = await provider.validateAccess({ id: 'user-1', username: 'user', isAdmin: false, authProvider: 'plex' });

    expect(ok).toBe(true);
    expect(encryptionMock.decrypt).toHaveBeenCalledWith('enc:token');
  });
});


