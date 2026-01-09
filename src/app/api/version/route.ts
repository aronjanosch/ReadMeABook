/**
 * Component: Version API Route
 * Documentation: documentation/backend/services/version.md
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const gitCommit = process.env.APP_VERSION || 'unknown';
  const buildDate = process.env.BUILD_DATE || 'unknown';

  // Get short commit hash (first 7 characters)
  const shortCommit = gitCommit !== 'unknown' && gitCommit.length >= 7
    ? gitCommit.substring(0, 7)
    : gitCommit;

  return NextResponse.json({
    version: `v.${shortCommit}`,
    commit: gitCommit,
    shortCommit,
    buildDate,
  });
}
