/**
 * Component: Paths Settings Tab
 * Documentation: documentation/settings-pages.md
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePathsSettings } from './usePathsSettings';
import type { PathsSettings } from '../../lib/types';

interface PathsTabProps {
  paths: PathsSettings;
  onChange: (paths: PathsSettings) => void;
  onValidationChange: (isValid: boolean) => void;
}

export function PathsTab({ paths, onChange, onValidationChange }: PathsTabProps) {
  const { testing, testResult, updatePath, testPaths } = usePathsSettings({
    paths,
    onChange,
    onValidationChange,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Directory Paths
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Configure download and media directory paths.
        </p>
      </div>

      {/* Download Directory */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Download Directory
        </label>
        <Input
          type="text"
          value={paths.downloadDir}
          onChange={(e) => updatePath('downloadDir', e.target.value)}
          placeholder="/downloads"
          className="font-mono"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Temporary location for torrent downloads (kept for seeding)
        </p>
      </div>

      {/* Media Directory */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Media Directory
        </label>
        <Input
          type="text"
          value={paths.mediaDir}
          onChange={(e) => updatePath('mediaDir', e.target.value)}
          placeholder="/media/audiobooks"
          className="font-mono"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Final location for organized audiobook library (Your backend scans this directory)
        </p>
      </div>

      {/* Metadata Tagging Toggle */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="metadata-tagging-settings"
            checked={paths.metadataTaggingEnabled}
            onChange={(e) => updatePath('metadataTaggingEnabled', e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label
              htmlFor="metadata-tagging-settings"
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              Auto-tag audio files with metadata
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Automatically write correct title, author, and narrator metadata to m4b and mp3 files
              during file organization. This significantly improves Plex matching accuracy for audiobooks
              with missing or incorrect metadata.
            </p>
          </div>
        </div>
      </div>

      {/* Chapter Merging Toggle */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="chapter-merging-settings"
            checked={paths.chapterMergingEnabled}
            onChange={(e) => updatePath('chapterMergingEnabled', e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label
              htmlFor="chapter-merging-settings"
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              Auto-merge chapters to M4B
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Automatically merge multi-file chapter downloads into a single M4B audiobook with chapter
              markers. Improves playback experience and library organization.
            </p>
          </div>
        </div>
      </div>

      {/* Test Paths Button */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <Button
          onClick={testPaths}
          loading={testing}
          disabled={!paths.downloadDir || !paths.mediaDir}
          variant="outline"
          className="w-full"
        >
          Test Paths
        </Button>
        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
