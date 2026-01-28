/**
 * Component: Recent Requests Table Tests
 * Documentation: documentation/admin-dashboard.md
 */

// @vitest-environment jsdom

import React from 'react';
import path from 'path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchWithAuthMock = vi.hoisted(() => vi.fn());
const mutateMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('swr', () => ({
  mutate: mutateMock,
}));

vi.mock('@/lib/utils/api', () => ({
  fetchWithAuth: fetchWithAuthMock,
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => toastMock,
}));

let RecentRequestsTable: typeof import('@/app/admin/components/RecentRequestsTable').RecentRequestsTable;

describe('RecentRequestsTable', () => {
  beforeEach(async () => {
    vi.resetModules();
    fetchWithAuthMock.mockReset();
    mutateMock.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.warning.mockReset();

    vi.doMock(path.resolve('src/app/admin/components/RequestActionsDropdown.tsx'), () => ({
      RequestActionsDropdown: ({
        request,
        onDelete,
        onManualSearch,
        onCancel,
        onFetchEbook,
        isLoading,
      }: {
        request: { requestId: string; title: string };
        onDelete: (requestId: string, title: string) => void;
        onManualSearch: (requestId: string) => void;
        onCancel: (requestId: string) => void;
        onFetchEbook?: (requestId: string) => void;
        isLoading?: boolean;
      }) => (
        <div>
          <button type="button" onClick={() => onDelete(request.requestId, request.title)}>
            Delete Trigger
          </button>
          <button type="button" onClick={() => onManualSearch(request.requestId)}>
            Manual Search Trigger
          </button>
          <button type="button" onClick={() => onCancel(request.requestId)}>
            Cancel Trigger
          </button>
          <button
            type="button"
            onClick={() => onFetchEbook?.(request.requestId)}
            disabled={isLoading}
          >
            Fetch Ebook Trigger
          </button>
        </div>
      ),
    }));

    const module = await import('@/app/admin/components/RecentRequestsTable');
    RecentRequestsTable = module.RecentRequestsTable;
  });

  it('shows empty state when there are no requests', () => {
    render(<RecentRequestsTable requests={[]} />);

    expect(screen.getByText('No Recent Requests')).toBeInTheDocument();
  });

  it('deletes a request and refreshes caches', async () => {
    fetchWithAuthMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <RecentRequestsTable
        requests={[
          {
            requestId: 'req-1',
            title: 'Delete Me',
            author: 'Author',
            status: 'pending',
            user: 'User',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            completedAt: null,
            errorMessage: null,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Trigger' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(fetchWithAuthMock).toHaveBeenCalledWith('/api/admin/requests/req-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    expect(mutateMock).toHaveBeenCalledWith('/api/admin/requests/recent');
    expect(mutateMock).toHaveBeenCalledWith('/api/admin/metrics');

    const predicateCall = mutateMock.mock.calls.find(
      (call) => typeof call[0] === 'function'
    );
    expect(predicateCall).toBeTruthy();
    const predicate = predicateCall?.[0] as (key: unknown) => boolean;
    expect(predicate('/api/audiobooks?query=test')).toBe(true);
    expect(predicate('/api/other')).toBe(false);
  });

  it('warns when ebook fetch fails', async () => {
    fetchWithAuthMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, message: 'No ebook available' }),
    });

    render(
      <RecentRequestsTable
        requests={[
          {
            requestId: 'req-2',
            title: 'Needs Ebook',
            author: 'Author',
            status: 'downloaded',
            user: 'User',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            completedAt: null,
            errorMessage: null,
          },
        ]}
        ebookSidecarEnabled
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fetch Ebook Trigger' }));

    await waitFor(() => {
      expect(fetchWithAuthMock).toHaveBeenCalledWith('/api/requests/req-2/fetch-ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(toastMock.warning).toHaveBeenCalledWith(
        'E-book fetch failed: No ebook available'
      );
    });
  });
});
