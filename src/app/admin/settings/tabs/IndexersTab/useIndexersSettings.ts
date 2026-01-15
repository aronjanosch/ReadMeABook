/**
 * Component: Indexers Settings Tab - Custom Hook
 * Documentation: documentation/settings-pages.md
 */

'use client';

import { useState } from 'react';
import { fetchWithAuth } from '@/lib/utils/api';
import type { TestResult } from '../../lib/types';

interface UseIndexersSettingsProps {
  prowlarrUrl: string;
  prowlarrApiKey: string;
  onValidationChange: (isValid: boolean) => void;
  onRefreshIndexers?: () => Promise<void>;
}

export function useIndexersSettings({
  prowlarrUrl,
  prowlarrApiKey,
  onValidationChange,
  onRefreshIndexers,
}: UseIndexersSettingsProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  /**
   * Test Prowlarr connection
   */
  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetchWithAuth('/api/admin/settings/test-prowlarr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: prowlarrUrl,
          apiKey: prowlarrApiKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onValidationChange(true);
        setTestResult({
          success: true,
          message: `Connected to Prowlarr. Found ${data.indexers?.length || 0} indexers`,
        });

        // Refresh indexers from database if callback provided
        if (onRefreshIndexers) {
          await onRefreshIndexers();
        }
      } else {
        onValidationChange(false);
        setTestResult({
          success: false,
          message: data.error || 'Connection failed',
        });
      }
    } catch (error) {
      onValidationChange(false);
      const errorMsg = error instanceof Error ? error.message : 'Failed to test connection';
      setTestResult({
        success: false,
        message: errorMsg,
      });
    } finally {
      setTesting(false);
    }
  };

  return {
    testing,
    testResult,
    testConnection,
  };
}
