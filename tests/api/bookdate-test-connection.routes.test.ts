/**
 * Component: BookDate Test Connection Route Tests
 * Documentation: documentation/features/bookdate-prd.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

const prismaMock = createPrismaMock();
const requireAuthMock = vi.hoisted(() => vi.fn());
const encryptionMock = vi.hoisted(() => ({
  decrypt: vi.fn(),
}));

vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/encryption.service', () => ({
  getEncryptionService: () => encryptionMock,
}));

describe('BookDate test connection route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects unauthenticated use of saved keys', async () => {
    const { POST } = await import('@/app/api/bookdate/test-connection/route');

    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ provider: 'openai', useSavedKey: true }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(401);
    expect(payload.error).toMatch(/Authentication required/i);
  });

  it('requires API key for OpenAI unauthenticated requests', async () => {
    const { POST } = await import('@/app/api/bookdate/test-connection/route');

    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ provider: 'openai' }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/API key is required/);
  });

  it('requires baseUrl for custom unauthenticated requests', async () => {
    const { POST } = await import('@/app/api/bookdate/test-connection/route');

    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ provider: 'custom' }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Base URL is required/);
  });

  it('requires provider for unauthenticated requests', async () => {
    const { POST } = await import('@/app/api/bookdate/test-connection/route');

    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({}),
    } as any);

    expect(response.status).toBe(400);
  });

  it('validates provider for unauthenticated requests', async () => {
    const { POST } = await import('@/app/api/bookdate/test-connection/route');

    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ provider: 'invalid', apiKey: 'x' }),
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns filtered OpenAI models for unauthenticated requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [
          { id: 'gpt-4-1' },
          { id: 'gpt-3.5-turbo' },
          { id: 'gpt-4-0' },
        ],
      }),
      text: vi.fn().mockResolvedValue('ok'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ provider: 'openai', apiKey: 'key' }),
    } as any);

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.models.map((m: any) => m.id)).toEqual(['gpt-4-0', 'gpt-4-1']);
  });

  it('returns filtered OpenAI models for authenticated requests', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [
          { id: 'gpt-4-2' },
          { id: 'gpt-3.5-turbo' },
          { id: 'gpt-4-1' },
        ],
      }),
      text: vi.fn().mockResolvedValue('ok'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'openai', apiKey: 'key' }),
    } as any);

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.models.map((m: any) => m.id)).toEqual(['gpt-4-1', 'gpt-4-2']);
  });

  it('returns Claude models for unauthenticated requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('ok'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ provider: 'claude', apiKey: 'key' }),
    } as any);

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.models.length).toBe(4);
  });

  it('returns OpenAI error for unauthenticated requests with invalid key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('bad key'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ provider: 'openai', apiKey: 'bad' }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Invalid OpenAI API key/i);
  });

  it('returns error when saved config is missing', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));
    prismaMock.bookDateConfig.findFirst.mockResolvedValue(null);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'openai', useSavedKey: true }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/No saved configuration/i);
  });

  it('returns error when saved key decryption fails', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));
    prismaMock.bookDateConfig.findFirst.mockResolvedValue({ apiKey: 'enc-key', baseUrl: null });
    encryptionMock.decrypt.mockImplementation(() => {
      throw new Error('decrypt failed');
    });

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'openai', useSavedKey: true }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(500);
    expect(payload.error).toMatch(/Failed to decrypt/i);
  });

  it('requires API key for authenticated OpenAI requests', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'openai', apiKey: '' }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/API key is required/);
  });

  it('requires baseUrl when using saved custom config without baseUrl', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));
    prismaMock.bookDateConfig.findFirst.mockResolvedValue({
      apiKey: 'enc-key',
      baseUrl: null,
    });
    encryptionMock.decrypt.mockReturnValue('decrypted');

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'custom', useSavedKey: true }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/No saved base URL/i);
  });

  it('uses saved key for custom provider and parses OpenAI format', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));
    prismaMock.bookDateConfig.findFirst.mockResolvedValue({
      apiKey: 'enc-key',
      baseUrl: 'http://custom',
    });
    encryptionMock.decrypt.mockReturnValue('decrypted');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ id: 'model-a', name: 'Model A' }],
      }),
      text: vi.fn().mockResolvedValue('ok'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'custom', useSavedKey: true }),
    } as any);

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.models).toEqual([{ id: 'model-a', name: 'Model A' }]);
  });

  it('validates custom base URLs for authenticated requests', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'custom', baseUrl: 'ftp://bad' }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Invalid base URL/i);
  });

  it('validates custom base URLs for unauthenticated requests', async () => {
    const { POST } = await import('@/app/api/bookdate/test-connection/route');

    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ provider: 'custom', baseUrl: 'ftp://bad' }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Invalid base URL/i);
  });

  it('returns custom provider models for authenticated requests', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        { id: 'model-a' },
        { id: 'model-b', name: 'Model B' },
      ]),
      text: vi.fn().mockResolvedValue('ok'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'custom', baseUrl: 'http://custom', apiKey: '' }),
    } as any);

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.models).toEqual([
      { id: 'model-a', name: 'model-a' },
      { id: 'model-b', name: 'Model B' },
    ]);
  });

  it('returns helpful message when custom models list cannot be parsed', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ unexpected: true }),
      text: vi.fn().mockResolvedValue('ok'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'custom', baseUrl: 'http://custom', apiKey: 'key' }),
    } as any);

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.message).toMatch(/could not parse models list/i);
  });

  it('returns network error when custom provider fetch fails', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));

    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'custom', baseUrl: 'http://custom', apiKey: 'key' }),
    } as any);

    const payload = await response.json();
    expect(response.status).toBe(500);
    expect(payload.error).toMatch(/Network error/i);
  });

  it('returns 400 (not 401) when custom provider returns 401 to prevent logout', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('Unauthorized'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'custom', baseUrl: 'http://custom', apiKey: 'bad-key' }),
    } as any);

    const payload = await response.json();
    // Should return 400, not 401, to prevent fetchWithAuth from logging user out
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Failed to connect to custom provider/i);
  });

  it('returns 400 (not 401) when custom provider returns 401 during unauthenticated request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('Unauthorized'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ provider: 'custom', baseUrl: 'http://custom', apiKey: 'bad-key' }),
    } as any);

    const payload = await response.json();
    // Should return 400, not 401, to prevent fetchWithAuth from logging user out
    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Failed to connect to custom provider/i);
  });

  it('allows custom provider when saved key decryption fails', async () => {
    requireAuthMock.mockImplementation((_req: any, handler: any) => handler(_req));
    prismaMock.bookDateConfig.findFirst.mockResolvedValue({
      apiKey: 'enc-key',
      baseUrl: 'http://custom',
    });
    encryptionMock.decrypt.mockImplementation(() => {
      throw new Error('decrypt failed');
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ id: 'model-a' }]),
      text: vi.fn().mockResolvedValue('ok'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/bookdate/test-connection/route');
    const response = await POST({
      headers: { get: () => 'Bearer token' },
      json: vi.fn().mockResolvedValue({ provider: 'custom', useSavedKey: true }),
    } as any);

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://custom/models',
      expect.objectContaining({
        method: 'GET',
        headers: {},
      })
    );
  });
});
