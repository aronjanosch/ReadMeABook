/**
 * Component: Version Badge
 * Documentation: documentation/frontend/components.md
 */

'use client';

import React, { useEffect, useState } from 'react';

export function VersionBadge() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    // Try to get version from build-time env var first (instant, no API call)
    const buildTimeVersion = process.env.NEXT_PUBLIC_GIT_COMMIT;

    if (buildTimeVersion && buildTimeVersion !== 'unknown') {
      // Get short commit hash (first 7 characters)
      const shortCommit = buildTimeVersion.length >= 7
        ? buildTimeVersion.substring(0, 7)
        : buildTimeVersion;
      setVersion(`v.${shortCommit}`);
    } else {
      // Fallback to API call if build-time env var is not available
      fetch('/api/version')
        .then((res) => res.json())
        .then((data) => {
          setVersion(data.version);
        })
        .catch((error) => {
          console.error('Failed to fetch version:', error);
          setVersion('v.dev');
        });
    }
  }, []);

  if (!version) {
    return null;
  }

  return (
    <div
      className="inline-flex items-center px-2.5 py-1 rounded-md bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm"
      title={`Version ${version}`}
    >
      <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300">
        {version}
      </span>
    </div>
  );
}
