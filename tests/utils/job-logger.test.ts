/**
 * Component: Job Logger Utility Tests
 * Documentation: documentation/backend/services/jobs.md
 */

import { describe, expect, it, vi } from 'vitest';

const infoMock = vi.fn();
const warnMock = vi.fn();
const errorMock = vi.fn();
const forJobMock = vi.fn(() => ({
  info: infoMock,
  warn: warnMock,
  error: errorMock,
}));

vi.mock('@/lib/utils/logger', () => ({
  RMABLogger: {
    forJob: forJobMock,
  },
}));

describe('JobLogger', () => {
  it('logs info, warn, and error messages via RMABLogger', async () => {
    const { JobLogger } = await import('@/lib/utils/job-logger');
    const logger = new JobLogger('job-1', 'Context');

    await logger.info('info message', { foo: 'bar' });
    await logger.warn('warn message');
    await logger.error('error message', { error: 'boom' });

    expect(forJobMock).toHaveBeenCalledWith('job-1', 'Context');
    expect(infoMock).toHaveBeenCalledWith('info message', { foo: 'bar' });
    expect(warnMock).toHaveBeenCalledWith('warn message', undefined);
    expect(errorMock).toHaveBeenCalledWith('error message', { error: 'boom' });
  });

  it('creates a job logger via helper', async () => {
    const { createJobLogger } = await import('@/lib/utils/job-logger');
    const logger = createJobLogger('job-2', 'Context2');

    await logger.info('message');

    expect(forJobMock).toHaveBeenCalledWith('job-2', 'Context2');
    expect(infoMock).toHaveBeenCalledWith('message', undefined);
  });
});
