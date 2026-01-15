/**
 * Component: Admin Jobs API Route Tests
 * Documentation: documentation/testing.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyAccessTokenMock = vi.hoisted(() => vi.fn());
const schedulerMock = vi.hoisted(() => ({
  getScheduledJobs: vi.fn(),
  createScheduledJob: vi.fn(),
  updateScheduledJob: vi.fn(),
  deleteScheduledJob: vi.fn(),
  triggerJobNow: vi.fn(),
}));

vi.mock('@/lib/utils/jwt', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock('@/lib/services/scheduler.service', () => ({
  getSchedulerService: () => schedulerMock,
}));

const makeRequest = (token?: string, body?: any) => ({
  headers: {
    get: (key: string) => (key.toLowerCase() === 'authorization' ? token : null),
  },
  json: vi.fn().mockResolvedValue(body || {}),
});

describe('Admin jobs routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAccessTokenMock.mockReturnValue({ role: 'admin' });
  });

  it('lists scheduled jobs', async () => {
    schedulerMock.getScheduledJobs.mockResolvedValue([{ id: 'job-1' }]);
    const { GET } = await import('@/app/api/admin/jobs/route');

    const response = await GET(makeRequest('Bearer token') as any);
    const payload = await response.json();

    expect(payload.jobs).toHaveLength(1);
  });

  it('creates a scheduled job', async () => {
    schedulerMock.createScheduledJob.mockResolvedValue({ id: 'job-2' });
    const { POST } = await import('@/app/api/admin/jobs/route');

    const response = await POST(makeRequest('Bearer token', { name: 'Job', type: 'type', schedule: '* * * * *' }) as any);
    const payload = await response.json();

    expect(payload.job.id).toBe('job-2');
  });

  it('updates a scheduled job', async () => {
    schedulerMock.updateScheduledJob.mockResolvedValue({ id: 'job-3' });
    const { PUT } = await import('@/app/api/admin/jobs/[id]/route');

    const response = await PUT(makeRequest('Bearer token', { name: 'Job' }) as any, { params: Promise.resolve({ id: 'job-3' }) });
    const payload = await response.json();

    expect(payload.success).toBe(true);
  });

  it('deletes a scheduled job', async () => {
    schedulerMock.deleteScheduledJob.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/admin/jobs/[id]/route');

    const response = await DELETE(makeRequest('Bearer token') as any, { params: Promise.resolve({ id: 'job-4' }) });
    const payload = await response.json();

    expect(payload.success).toBe(true);
  });

  it('triggers a scheduled job', async () => {
    schedulerMock.triggerJobNow.mockResolvedValue('job-5');
    const { POST } = await import('@/app/api/admin/jobs/[id]/trigger/route');

    const response = await POST(makeRequest('Bearer token') as any, { params: Promise.resolve({ id: 'job-5' }) });
    const payload = await response.json();

    expect(payload.jobId).toBe('job-5');
  });
});


