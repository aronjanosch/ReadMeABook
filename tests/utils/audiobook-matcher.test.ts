/**
 * Component: Audiobook Matcher Tests
 * Documentation: documentation/integrations/audible.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

const prismaMock = createPrismaMock();

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('audiobook-matcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ASIN exact match from dedicated field', async () => {
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        plexGuid: 'guid-1',
        plexRatingKey: 'rating-1',
        title: 'Test Book',
        author: 'Test Author',
        asin: 'B00TEST123',
        isbn: null,
      },
    ]);

    const { findPlexMatch } = await import('@/lib/utils/audiobook-matcher');
    const match = await findPlexMatch({
      asin: 'B00TEST123',
      title: 'Test Book',
      author: 'Test Author',
    });

    expect(match?.plexGuid).toBe('guid-1');
  });

  it('rejects candidates with mismatched ASINs in plexGuid', async () => {
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        plexGuid: 'com.plexapp.agents.audible://B00WRONG999',
        plexRatingKey: null,
        title: 'Test Book',
        author: 'Test Author',
        asin: null,
        isbn: null,
      },
    ]);

    const { findPlexMatch } = await import('@/lib/utils/audiobook-matcher');
    const match = await findPlexMatch({
      asin: 'B00RIGHT123',
      title: 'Test Book',
      author: 'Test Author',
    });

    expect(match).toBeNull();
  });

  it('uses narrator matching when author match is weak', async () => {
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        plexGuid: 'guid-narrator',
        plexRatingKey: null,
        title: 'Great Book',
        author: 'Jane Narrator',
        asin: null,
        isbn: null,
      },
    ]);

    const { findPlexMatch } = await import('@/lib/utils/audiobook-matcher');
    const match = await findPlexMatch({
      asin: 'B00TEST999',
      title: 'Great Book',
      author: 'Different Author',
      narrator: 'Jane Narrator',
    });

    expect(match?.plexGuid).toBe('guid-narrator');
  });

  it('matches library items by ASIN, ISBN, then fuzzy match', async () => {
    const items = [
      { id: '1', externalId: 'g1', title: 'Alpha', author: 'Author A', asin: 'ASIN1' },
      { id: '2', externalId: 'g2', title: 'Beta', author: 'Author B', isbn: '978-1-23456-789-7' },
      { id: '3', externalId: 'g3', title: 'Gamma Book', author: 'Author C' },
    ];

    const { matchAudiobook } = await import('@/lib/utils/audiobook-matcher');
    const asinMatch = matchAudiobook({ title: 'x', author: 'y', asin: 'ASIN1' }, items);
    expect(asinMatch?.externalId).toBe('g1');

    const isbnMatch = matchAudiobook({ title: 'x', author: 'y', isbn: '9781234567897' }, items);
    expect(isbnMatch?.externalId).toBe('g2');

    const fuzzyMatch = matchAudiobook({ title: 'Gamma Book', author: 'Author C' }, items);
    expect(fuzzyMatch?.externalId).toBe('g3');
  });

  it('enriches audiobooks with availability and request status', async () => {
    prismaMock.plexLibrary.findMany
      .mockResolvedValueOnce([
        {
          plexGuid: 'guid-1',
          plexRatingKey: null,
          title: 'Book One',
          author: 'Author One',
          asin: 'ASIN1',
          isbn: null,
        },
      ])
      .mockResolvedValueOnce([]);

    prismaMock.audiobook.findMany.mockResolvedValue([
      {
        id: 'a1',
        audibleAsin: 'ASIN1',
        requests: [
          {
            id: 'r1',
            status: 'downloading',
            userId: 'other-user',
            user: { plexUsername: 'OtherUser' },
          },
        ],
      },
    ]);

    const { enrichAudiobooksWithMatches } = await import('@/lib/utils/audiobook-matcher');
    const results = await enrichAudiobooksWithMatches(
      [
        { asin: 'ASIN1', title: 'Book One', author: 'Author One' },
        { asin: 'ASIN2', title: 'Book Two', author: 'Author Two' },
      ],
      'current-user'
    );

    expect(results[0].isAvailable).toBe(true);
    expect(results[0].isRequested).toBe(true);
    expect(results[0].requestedByUsername).toBe('OtherUser');

    expect(results[1].isAvailable).toBe(false);
    expect(results[1].isRequested).toBe(false);
  });
});


