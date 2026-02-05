/**
 * Component: Audiobook Details API Route
 * Documentation: documentation/integrations/audible.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAudibleService } from '@/lib/integrations/audible.service';
import { getConfigService } from '@/lib/services/config.service';
import { AUDIBLE_REGIONS, DEFAULT_AUDIBLE_REGION, AudibleRegion } from '@/lib/types/audible';
import { RMABLogger } from '@/lib/utils/logger';

const logger = RMABLogger.create('API.Audiobooks.Details');

/**
 * GET /api/audiobooks/[asin]
 * Get detailed information for a specific audiobook
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asin: string }> }
) {
  try {
    const { asin } = await params;

    if (!asin || asin.length !== 10) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Valid ASIN is required',
        },
        { status: 400 }
      );
    }

    const audibleService = getAudibleService();
    const audiobook = await audibleService.getAudiobookDetails(asin);

    if (!audiobook) {
      return NextResponse.json(
        {
          error: 'NotFound',
          message: 'Audiobook not found',
        },
        { status: 404 }
      );
    }

    const configService = getConfigService();
    const region = (await configService.getAudibleRegion()) as AudibleRegion || DEFAULT_AUDIBLE_REGION;
    const audibleUrl = `${AUDIBLE_REGIONS[region].baseUrl}/pd/${asin}`;

    return NextResponse.json({
      success: true,
      audiobook,
      audibleUrl,
    });
  } catch (error) {
    logger.error('Failed to get audiobook details', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: 'FetchError',
        message: 'Failed to fetch audiobook details',
      },
      { status: 500 }
    );
  }
}
