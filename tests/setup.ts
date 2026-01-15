/**
 * Component: Test Setup
 * Documentation: documentation/README.md
 */

import { beforeAll, afterAll, vi } from 'vitest';
import '@testing-library/jest-dom';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.TZ = 'UTC';

  if (!globalThis.fetch) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = () => {
      throw new Error('fetch was called without a mock in tests');
    };
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});
