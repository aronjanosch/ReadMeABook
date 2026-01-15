/**
 * Component: Encryption Service Tests
 * Documentation: documentation/backend/services/config.md
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_KEY = process.env.CONFIG_ENCRYPTION_KEY;

afterEach(() => {
  process.env.CONFIG_ENCRYPTION_KEY = ORIGINAL_KEY;
  vi.resetModules();
});

describe('EncryptionService', () => {
  it('throws when encryption key is missing', async () => {
    delete process.env.CONFIG_ENCRYPTION_KEY;
    vi.resetModules();

    const { EncryptionService } = await import('@/lib/services/encryption.service');
    expect(() => new EncryptionService()).toThrow(/CONFIG_ENCRYPTION_KEY/);
  });

  it('encrypts and decrypts values', async () => {
    process.env.CONFIG_ENCRYPTION_KEY = 'a'.repeat(32);
    vi.resetModules();

    const { EncryptionService } = await import('@/lib/services/encryption.service');
    const service = new EncryptionService();

    const encrypted = service.encrypt('secret');
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe('secret');
  });

  it('rejects invalid encrypted data formats', async () => {
    process.env.CONFIG_ENCRYPTION_KEY = 'b'.repeat(32);
    vi.resetModules();

    const { EncryptionService } = await import('@/lib/services/encryption.service');
    const service = new EncryptionService();

    expect(() => service.decrypt('invalid')).toThrow(/Decryption failed/);
  });

  it('generates a random key', async () => {
    const { EncryptionService } = await import('@/lib/services/encryption.service');
    const key = EncryptionService.generateKey();

    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(40);
  });
});
