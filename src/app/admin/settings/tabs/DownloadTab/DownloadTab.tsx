/**
 * Component: Download Client Settings Tab
 * Documentation: documentation/settings-pages.md
 */

'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDownloadSettings } from './useDownloadSettings';
import type { DownloadClientSettings } from '../../lib/types';

interface DownloadTabProps {
  downloadClient: DownloadClientSettings;
  onChange: (settings: DownloadClientSettings) => void;
  onValidationChange: (isValid: boolean) => void;
}

export function DownloadTab({ downloadClient, onChange, onValidationChange }: DownloadTabProps) {
  const { testing, testResult, updateField, handleTypeChange, testConnection } = useDownloadSettings({
    downloadClient,
    onChange,
    onValidationChange,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Download Client
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Configure your download client: qBittorrent for torrents or SABnzbd for Usenet/NZB downloads.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Client Type
        </label>
        <select
          value={downloadClient.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="qbittorrent">qBittorrent</option>
          <option value="sabnzbd">SABnzbd</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Server URL
        </label>
        <Input
          type="url"
          value={downloadClient.url}
          onChange={(e) => updateField('url', e.target.value)}
          placeholder="http://localhost:8080"
        />
      </div>

      {/* qBittorrent: Username + Password */}
      {downloadClient.type === 'qbittorrent' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <Input
              type="text"
              value={downloadClient.username}
              onChange={(e) => updateField('username', e.target.value)}
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <Input
              type="password"
              value={downloadClient.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="Enter password"
            />
          </div>
        </>
      )}

      {/* SABnzbd: API Key only */}
      {downloadClient.type === 'sabnzbd' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key
          </label>
          <Input
            type="password"
            value={downloadClient.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="Enter SABnzbd API key"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Find this in SABnzbd under Config → General → API Key
          </p>
        </div>
      )}

      {/* SSL Verification Toggle */}
      {downloadClient.url.startsWith('https') && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="disable-ssl-verify"
              checked={downloadClient.disableSSLVerify}
              onChange={(e) => updateField('disableSSLVerify', e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <div className="flex-1">
              <label
                htmlFor="disable-ssl-verify"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
              >
                Disable SSL Certificate Verification
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Enable this if you're using a self-signed certificate or getting SSL errors.
                <span className="text-yellow-700 dark:text-yellow-500 font-medium"> ⚠️ Only use on trusted private networks.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Remote Path Mapping */}
      <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="remote-path-mapping"
            checked={downloadClient.remotePathMappingEnabled}
            onChange={(e) => updateField('remotePathMappingEnabled', e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <div className="flex-1">
            <label
              htmlFor="remote-path-mapping"
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              Enable Remote Path Mapping
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Use this when qBittorrent runs on a different machine or uses different mount points (e.g., remote seedbox, Docker containers)
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono">
              Example: Remote <span className="text-blue-600 dark:text-blue-400">/remote/mnt/d/done</span> → Local <span className="text-green-600 dark:text-green-400">/downloads</span>
            </p>

            {/* Warning for existing downloads */}
            {downloadClient.remotePathMappingEnabled && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Note:</strong> Path mapping only affects new downloads. In-progress downloads will continue using their original paths.
                </p>
              </div>
            )}

            {/* Conditional Fields */}
            {downloadClient.remotePathMappingEnabled && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Remote Path (from qBittorrent)
                  </label>
                  <Input
                    type="text"
                    placeholder="/remote/mnt/d/done"
                    value={downloadClient.remotePath}
                    onChange={(e) => updateField('remotePath', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The path prefix as reported by qBittorrent
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Local Path (for ReadMeABook)
                  </label>
                  <Input
                    type="text"
                    placeholder="/downloads"
                    value={downloadClient.localPath}
                    onChange={(e) => updateField('localPath', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The actual path where files are accessible
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <Button
          onClick={testConnection}
          loading={testing}
          disabled={
            !downloadClient.url ||
            !downloadClient.password ||
            (downloadClient.type === 'qbittorrent' && !downloadClient.username)
          }
          variant="outline"
          className="w-full"
        >
          Test Connection
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
