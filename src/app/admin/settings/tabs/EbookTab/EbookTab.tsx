/**
 * Component: E-book Settings Tab
 * Documentation: documentation/settings-pages.md
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useEbookSettings } from './useEbookSettings';
import type { EbookSettings } from '../../lib/types';

interface EbookTabProps {
  ebook: EbookSettings;
  onChange: (ebook: EbookSettings) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  markAsSaved: () => void;
}

export function EbookTab({ ebook, onChange, onSuccess, onError, markAsSaved }: EbookTabProps) {
  const {
    saving,
    testingFlaresolverr,
    flaresolverrTestResult,
    updateEbook,
    testFlaresolverrConnection,
    saveSettings,
  } = useEbookSettings({ ebook, onChange, onSuccess, onError, markAsSaved });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          E-book Sidecar
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Automatically download e-books from Anna's Archive to accompany your audiobooks.
          E-books are placed in the same folder as the audiobook files.
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="ebook-enabled"
            checked={ebook.enabled || false}
            onChange={(e) => updateEbook('enabled', e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label
              htmlFor="ebook-enabled"
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              Enable e-book sidecar downloads
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              When enabled, the system will search for e-books matching your audiobook's ASIN
              and download them to the same folder.
            </p>
          </div>
        </div>
      </div>

      {/* Format Selection */}
      {ebook.enabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preferred Format
          </label>
          <select
            value={ebook.preferredFormat || 'epub'}
            onChange={(e) => updateEbook('preferredFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="epub">EPUB</option>
            <option value="pdf">PDF</option>
            <option value="mobi">MOBI</option>
            <option value="azw3">AZW3</option>
            <option value="any">Any format</option>
          </select>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            EPUB is recommended for most e-readers. "Any format" will download the first available format.
          </p>
        </div>
      )}

      {/* Base URL (Advanced) */}
      {ebook.enabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Base URL (Advanced)
          </label>
          <Input
            type="text"
            value={ebook.baseUrl || 'https://annas-archive.li'}
            onChange={(e) => updateEbook('baseUrl', e.target.value)}
            placeholder="https://annas-archive.li"
            className="font-mono"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Change this if the primary Anna's Archive mirror is unavailable.
          </p>
        </div>
      )}

      {/* FlareSolverr (Optional - for Cloudflare bypass) */}
      {ebook.enabled && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              FlareSolverr URL (Optional)
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={ebook.flaresolverrUrl || ''}
                onChange={(e) => updateEbook('flaresolverrUrl', e.target.value)}
                placeholder="http://localhost:8191"
                className="font-mono flex-1"
              />
              <Button
                onClick={testFlaresolverrConnection}
                loading={testingFlaresolverr}
                variant="secondary"
                className="whitespace-nowrap"
              >
                Test Connection
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              FlareSolverr helps bypass Cloudflare protection on Anna's Archive.
              Leave empty if not needed.
            </p>
            {flaresolverrTestResult && (
              <div
                className={`mt-2 p-3 rounded-lg text-sm ${
                  flaresolverrTestResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}
              >
                {flaresolverrTestResult.success ? '✓ ' : '✗ '}
                {flaresolverrTestResult.message}
              </div>
            )}
          </div>
          {!ebook.flaresolverrUrl && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Without FlareSolverr, e-book downloads may fail if Anna's Archive
                has Cloudflare protection enabled. Success rates are typically lower without it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          How it works
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>• Searches Anna's Archive in two ways:</li>
          <li className="ml-4">1. First tries ASIN (exact match - most accurate)</li>
          <li className="ml-4">2. Falls back to title + author (with book/language filters)</li>
          <li>• Downloads matching e-book in your preferred format</li>
          <li>• Places e-book file in the same folder as the audiobook</li>
          <li>• If no match is found or download fails, audiobook download continues normally</li>
          <li>• Completely optional and non-blocking</li>
        </ul>
      </div>

      {/* Warning Box */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
          ⚠️ Important Note
        </h3>
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Anna's Archive is a shadow library. Use of this feature is at your own discretion and responsibility.
          Ensure compliance with your local laws and regulations.
        </p>
      </div>

      {/* Save Button */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <Button
          onClick={saveSettings}
          loading={saving}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Save E-book Sidecar Settings
        </Button>
      </div>
    </div>
  );
}
