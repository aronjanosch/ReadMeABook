/**
 * Component: BookDate Helper Tests
 * Documentation: documentation/features/bookdate-prd.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

const prismaMock = createPrismaMock();
const configMock = vi.hoisted(() => ({
  getBackendMode: vi.fn(),
  get: vi.fn(),
  getPlexConfig: vi.fn(),
}));
const encryptionMock = vi.hoisted(() => ({
  decrypt: vi.fn(),
}));
const plexMock = vi.hoisted(() => ({
  getServerAccessToken: vi.fn(),
  getLibraryContent: vi.fn(),
}));
const findPlexMatchMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  create: vi.fn(),
}));
const audibleState = vi.hoisted(() => ({
  instance: {
    search: vi.fn(),
    getAudiobookDetails: vi.fn(),
  },
  ctor: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/config.service', () => ({
  getConfigService: () => configMock,
}));

vi.mock('@/lib/services/encryption.service', () => ({
  getEncryptionService: () => encryptionMock,
}));

vi.mock('@/lib/integrations/plex.service', () => ({
  getPlexService: () => plexMock,
}));

vi.mock('@/lib/integrations/audible.service', () => ({
  AudibleService: audibleState.ctor,
}));

vi.mock('@/lib/utils/audiobook-matcher', () => ({
  findPlexMatch: findPlexMatchMock,
}));

vi.mock('@/lib/utils/logger', () => ({
  RMABLogger: {
    create: loggerMock.create,
  },
}));

describe('BookDate helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loggerMock.create.mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    });
    audibleState.ctor.mockImplementation(function () {
      return audibleState.instance;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty library when audiobookshelf has no library id', async () => {
    configMock.getBackendMode.mockResolvedValue('audiobookshelf');
    configMock.get.mockResolvedValue(null);

    const { getUserLibraryBooks } = await import('@/lib/bookdate/helpers');
    const result = await getUserLibraryBooks('user-1', 'rated');

    expect(result).toEqual([]);
    expect(prismaMock.plexLibrary.findMany).not.toHaveBeenCalled();
  });

  it('maps audiobookshelf cached books without ratings', async () => {
    configMock.getBackendMode.mockResolvedValue('audiobookshelf');
    configMock.get.mockResolvedValue('abs-lib-1');
    prismaMock.user.findUnique.mockResolvedValue({ plexId: 'local-1' });
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        title: 'Book',
        author: 'Author',
        narrator: 'Narr',
        plexGuid: 'guid',
        plexRatingKey: 'rk',
        userRating: '7',
      },
    ]);

    const { getUserLibraryBooks } = await import('@/lib/bookdate/helpers');
    const result = await getUserLibraryBooks('user-1', 'full');

    expect(result).toEqual([
      {
        title: 'Book',
        author: 'Author',
        narrator: 'Narr',
        rating: undefined,
      },
    ]);
  });

  it('returns rated books for local admin Plex users', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({ libraryId: 'plex-lib' });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ plexId: 'local-1' })
      .mockResolvedValueOnce({ authToken: 'token', plexId: 'local-1', role: 'admin' });
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        title: 'Rated',
        author: 'Author',
        narrator: null,
        plexGuid: 'guid-1',
        plexRatingKey: 'rk-1',
        userRating: '9',
      },
      {
        title: 'Unrated',
        author: 'Author',
        narrator: null,
        plexGuid: 'guid-2',
        plexRatingKey: 'rk-2',
        userRating: null,
      },
    ]);

    const { getUserLibraryBooks } = await import('@/lib/bookdate/helpers');
    const result = await getUserLibraryBooks('user-1', 'rated');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Rated');
    expect(result[0].rating).toBe(9);
  });

  it('returns rated books for Plex users with personal ratings', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({
      libraryId: 'plex-lib',
      serverUrl: 'http://plex',
      machineIdentifier: 'machine',
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ plexId: 'plex-1' })
      .mockResolvedValueOnce({ authToken: 'enc-token', plexId: 'plex-1', role: 'user' });
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        title: 'Rated Book',
        author: 'Author',
        narrator: null,
        plexGuid: 'guid-1',
        plexRatingKey: 'rk-1',
        userRating: null,
      },
      {
        title: 'Unrated',
        author: 'Author',
        narrator: null,
        plexGuid: 'guid-2',
        plexRatingKey: 'rk-2',
        userRating: null,
      },
    ]);
    encryptionMock.decrypt.mockReturnValue('user-token');
    plexMock.getServerAccessToken.mockResolvedValue('server-token');
    plexMock.getLibraryContent.mockResolvedValue([
      { guid: 'guid-1', ratingKey: 'rk-1', userRating: 8 },
      { guid: 'guid-2', ratingKey: 'rk-2' },
    ]);

    const { getUserLibraryBooks } = await import('@/lib/bookdate/helpers');
    const result = await getUserLibraryBooks('user-1', 'rated');

    expect(result).toEqual([
      {
        title: 'Rated Book',
        author: 'Author',
        narrator: undefined,
        rating: 8,
      },
    ]);
  });

  it('falls back to cached books when user token is missing', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({ libraryId: 'plex-lib' });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ plexId: 'plex-2' })
      .mockResolvedValueOnce({ authToken: null, plexId: 'plex-2', role: 'user' });
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        title: 'Book',
        author: 'Author',
        narrator: null,
        plexGuid: 'guid',
        plexRatingKey: 'rk',
        userRating: null,
      },
    ]);

    const { getUserLibraryBooks } = await import('@/lib/bookdate/helpers');
    const result = await getUserLibraryBooks('user-1', 'full');

    expect(result).toEqual([
      {
        title: 'Book',
        author: 'Author',
        narrator: undefined,
        rating: undefined,
      },
    ]);
  });

  it('returns empty list when Plex library id is missing', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({ libraryId: null });

    const { getUserLibraryBooks } = await import('@/lib/bookdate/helpers');
    const result = await getUserLibraryBooks('user-1', 'full');

    expect(result).toEqual([]);
    expect(prismaMock.plexLibrary.findMany).not.toHaveBeenCalled();
  });

  it('falls back to cached books when Plex server URL is missing', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({ libraryId: 'plex-lib' });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ plexId: 'plex-3' })
      .mockResolvedValueOnce({ authToken: 'token', plexId: 'plex-3', role: 'user' });
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        title: 'Book',
        author: 'Author',
        narrator: null,
        plexGuid: 'guid',
        plexRatingKey: 'rk',
        userRating: null,
      },
    ]);

    const { getUserLibraryBooks } = await import('@/lib/bookdate/helpers');
    const result = await getUserLibraryBooks('user-1', 'full');

    expect(result).toEqual([
      {
        title: 'Book',
        author: 'Author',
        narrator: undefined,
        rating: undefined,
      },
    ]);
    expect(plexMock.getServerAccessToken).not.toHaveBeenCalled();
  });

  it('uses plaintext token when decryption fails', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({
      libraryId: 'plex-lib',
      serverUrl: 'http://plex',
      machineIdentifier: 'machine',
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ plexId: 'plex-4' })
      .mockResolvedValueOnce({ authToken: 'plain-token', plexId: 'plex-4', role: 'user' });
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        title: 'Rated Book',
        author: 'Author',
        narrator: null,
        plexGuid: 'guid-1',
        plexRatingKey: 'rk-1',
        userRating: null,
      },
    ]);
    encryptionMock.decrypt.mockImplementation(() => {
      throw new Error('decrypt failed');
    });
    plexMock.getServerAccessToken.mockResolvedValue('server-token');
    plexMock.getLibraryContent.mockResolvedValue([
      { guid: 'guid-1', ratingKey: 'rk-1', userRating: 7 },
    ]);

    const { getUserLibraryBooks } = await import('@/lib/bookdate/helpers');
    const result = await getUserLibraryBooks('user-1', 'rated');

    expect(result[0].rating).toBe(7);
    expect(plexMock.getServerAccessToken).toHaveBeenCalledWith('machine', 'plain-token');
  });

  it('returns cached books when machine identifier is missing', async () => {
    configMock.getBackendMode.mockResolvedValue('plex');
    configMock.getPlexConfig.mockResolvedValue({
      libraryId: 'plex-lib',
      serverUrl: 'http://plex',
      machineIdentifier: null,
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ plexId: 'plex-5' })
      .mockResolvedValueOnce({ authToken: 'enc-token', plexId: 'plex-5', role: 'user' });
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        title: 'Book',
        author: 'Author',
        narrator: null,
        plexGuid: 'guid',
        plexRatingKey: 'rk',
        userRating: null,
      },
    ]);
    encryptionMock.decrypt.mockReturnValue('user-token');

    const { getUserLibraryBooks } = await import('@/lib/bookdate/helpers');
    const result = await getUserLibraryBooks('user-1', 'full');

    expect(result).toEqual([
      {
        title: 'Book',
        author: 'Author',
        narrator: undefined,
        rating: undefined,
      },
    ]);
    expect(plexMock.getServerAccessToken).not.toHaveBeenCalled();
  });

  it('builds recent swipe history from prioritized swipes', async () => {
    const now = new Date();
    const older = new Date(now.getTime() - 1000);

    prismaMock.bookDateSwipe.findMany
      .mockResolvedValueOnce([
        {
          bookTitle: 'Latest',
          bookAuthor: 'Author',
          action: 'right',
          markedAsKnown: false,
          createdAt: now,
        },
      ])
      .mockResolvedValueOnce([
        {
          bookTitle: 'Older',
          bookAuthor: 'Author',
          action: 'up',
          markedAsKnown: false,
          createdAt: older,
        },
      ]);

    const { getUserRecentSwipes } = await import('@/lib/bookdate/helpers');
    const result = await getUserRecentSwipes('user-1', 2);

    expect(result).toEqual([
      { title: 'Latest', author: 'Author', action: 'right', markedAsKnown: false },
      { title: 'Older', author: 'Author', action: 'up', markedAsKnown: false },
    ]);
    expect(prismaMock.bookDateSwipe.findMany).toHaveBeenCalledTimes(2);
  });

  it('skips dismiss lookup when limit is filled by non-dismiss swipes', async () => {
    prismaMock.bookDateSwipe.findMany.mockResolvedValueOnce([
      {
        bookTitle: 'Recent',
        bookAuthor: 'Author',
        action: 'right',
        markedAsKnown: true,
        createdAt: new Date(),
      },
    ]);

    const { getUserRecentSwipes } = await import('@/lib/bookdate/helpers');
    const result = await getUserRecentSwipes('user-1', 1);

    expect(result).toEqual([
      { title: 'Recent', author: 'Author', action: 'right', markedAsKnown: true },
    ]);
    expect(prismaMock.bookDateSwipe.findMany).toHaveBeenCalledTimes(1);
  });

  it('builds AI prompt with mapped swipe actions', async () => {
    const now = new Date();
    configMock.getBackendMode.mockResolvedValue('audiobookshelf');
    configMock.get.mockResolvedValue('abs-lib-1');
    prismaMock.user.findUnique.mockResolvedValue({ plexId: 'local-1' });
    prismaMock.plexLibrary.findMany.mockResolvedValue([
      {
        title: 'Lib',
        author: 'Author',
        narrator: null,
        plexGuid: 'guid',
        plexRatingKey: 'rk',
        userRating: '8',
      },
    ]);
    prismaMock.bookDateSwipe.findMany
      .mockResolvedValueOnce([
        {
          bookTitle: 'Known',
          bookAuthor: 'Author',
          action: 'right',
          markedAsKnown: true,
          createdAt: now,
        },
        {
          bookTitle: 'Requested',
          bookAuthor: 'Author',
          action: 'right',
          markedAsKnown: false,
          createdAt: new Date(now.getTime() - 1000),
        },
        {
          bookTitle: 'Rejected',
          bookAuthor: 'Author',
          action: 'left',
          markedAsKnown: false,
          createdAt: new Date(now.getTime() - 2000),
        },
      ])
      .mockResolvedValueOnce([
        {
          bookTitle: 'Dismissed',
          bookAuthor: 'Author',
          action: 'up',
          markedAsKnown: false,
          createdAt: new Date(now.getTime() - 3000),
        },
      ]);

    const { buildAIPrompt } = await import('@/lib/bookdate/helpers');
    const prompt = await buildAIPrompt('user-1', { libraryScope: 'full', customPrompt: 'prefs' });
    const parsed = JSON.parse(prompt);

    expect(parsed.user_context.library_books).toHaveLength(1);
    expect(parsed.user_context.swipe_history).toEqual([
      { title: 'Known', author: 'Author', user_action: 'marked_as_liked' },
      { title: 'Requested', author: 'Author', user_action: 'requested' },
      { title: 'Rejected', author: 'Author', user_action: 'rejected' },
      { title: 'Dismissed', author: 'Author', user_action: 'dismissed' },
    ]);
  });

  it('returns cached Audnexus matches without fetching Audible', async () => {
    prismaMock.audibleCache.findFirst.mockResolvedValue({
      asin: 'ASIN1',
      title: 'Title',
      author: 'Author',
      narrator: 'Narr',
      rating: '4.5',
      description: 'Desc',
      coverArtUrl: 'cover',
    });

    const { matchToAudnexus } = await import('@/lib/bookdate/helpers');
    const result = await matchToAudnexus('Title', 'Author');

    expect(result?.asin).toBe('ASIN1');
    expect(result?.rating).toBe(4.5);
    expect(audibleState.ctor).not.toHaveBeenCalled();
  });

  it('returns null when Audible search finds no results', async () => {
    prismaMock.audibleCache.findFirst.mockResolvedValue(null);
    audibleState.instance.search.mockResolvedValue({ results: [] });

    const { matchToAudnexus } = await import('@/lib/bookdate/helpers');
    const result = await matchToAudnexus('Missing', 'Author');

    expect(result).toBeNull();
    expect(audibleState.instance.search).toHaveBeenCalled();
  });

  it('returns null when Audible details are unavailable', async () => {
    prismaMock.audibleCache.findFirst.mockResolvedValue(null);
    audibleState.instance.search.mockResolvedValue({
      results: [{ asin: 'ASIN2', title: 'Title', author: 'Author' }],
    });
    audibleState.instance.getAudiobookDetails.mockResolvedValue(null);

    const { matchToAudnexus } = await import('@/lib/bookdate/helpers');
    const result = await matchToAudnexus('Title', 'Author');

    expect(result).toBeNull();
  });

  it('returns Audnexus details for successful Audible matches', async () => {
    prismaMock.audibleCache.findFirst.mockResolvedValue(null);
    audibleState.instance.search.mockResolvedValue({
      results: [{ asin: 'ASIN3', title: 'Title', author: 'Author' }],
    });
    audibleState.instance.getAudiobookDetails.mockResolvedValue({
      asin: 'ASIN3',
      title: 'Title',
      author: 'Author',
      narrator: 'Narr',
      rating: 4.2,
      description: 'Desc',
      coverArtUrl: 'cover',
    });

    const { matchToAudnexus } = await import('@/lib/bookdate/helpers');
    const result = await matchToAudnexus('Title', 'Author');

    expect(result).toEqual({
      asin: 'ASIN3',
      title: 'Title',
      author: 'Author',
      narrator: 'Narr',
      rating: 4.2,
      description: 'Desc',
      coverUrl: 'cover',
    });
  });

  it('checks library matches using the Plex matcher', async () => {
    const { isInLibrary } = await import('@/lib/bookdate/helpers');

    findPlexMatchMock.mockResolvedValueOnce({ title: 'Match' });
    await expect(isInLibrary('user-1', 'Title', 'Author')).resolves.toBe(true);

    findPlexMatchMock.mockResolvedValueOnce(null);
    await expect(isInLibrary('user-1', 'Title', 'Author')).resolves.toBe(false);
  });

  it('checks existing requests and swipes', async () => {
    const { isAlreadyRequested, isAlreadySwiped } = await import('@/lib/bookdate/helpers');

    prismaMock.request.findFirst.mockResolvedValueOnce({ id: 'req-1' });
    prismaMock.request.findFirst.mockResolvedValueOnce(null);
    prismaMock.bookDateSwipe.findFirst.mockResolvedValueOnce({ id: 'swipe-1' });
    prismaMock.bookDateSwipe.findFirst.mockResolvedValueOnce(null);

    await expect(isAlreadyRequested('user-1', 'ASIN1')).resolves.toBe(true);
    await expect(isAlreadyRequested('user-1', 'ASIN1')).resolves.toBe(false);
    await expect(isAlreadySwiped('user-1', 'Title', 'Author')).resolves.toBe(true);
    await expect(isAlreadySwiped('user-1', 'Title', 'Author')).resolves.toBe(false);
  });

  it('throws on invalid AI provider', async () => {
    const { callAI } = await import('@/lib/bookdate/helpers');

    await expect(callAI('invalid', 'model', 'key', '{}')).rejects.toThrow('Invalid provider');
  });

  it('requires a base URL for custom providers', async () => {
    const { callAI } = await import('@/lib/bookdate/helpers');

    await expect(callAI('custom', 'model', 'key', '{}', null)).rejects.toThrow('Base URL is required');
  });

  it('calls OpenAI and parses JSON recommendations', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{\"recommendations\":[]}' } }],
      }),
      text: vi.fn().mockResolvedValue('ok'),
    });
    vi.stubGlobal('fetch', fetchMock);
    encryptionMock.decrypt.mockReturnValue('api-key');

    const { callAI } = await import('@/lib/bookdate/helpers');
    const result = await callAI('openai', 'model', 'enc-key', '{}');

    expect(result.recommendations).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('calls Claude and strips markdown from JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        content: [{ text: '```json\n{\"recommendations\":[]}\n```' }],
      }),
      text: vi.fn().mockResolvedValue('ok'),
    });
    vi.stubGlobal('fetch', fetchMock);
    encryptionMock.decrypt.mockReturnValue('api-key');

    const { callAI } = await import('@/lib/bookdate/helpers');
    const result = await callAI('claude', 'model', 'enc-key', '{}');

    expect(result.recommendations).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('calls custom provider and parses direct JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{\"recommendations\":[]}' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    encryptionMock.decrypt.mockReturnValue('api-key');

    const { callAI } = await import('@/lib/bookdate/helpers');
    const result = await callAI('custom', 'model', 'enc-key', '{}', 'http://custom/');

    expect(result.recommendations).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://custom/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('retries custom providers without structured output', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('response_format unsupported'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{\"recommendations\":[]}' } }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    encryptionMock.decrypt.mockImplementation(() => {
      throw new Error('decrypt failed');
    });

    const { callAI } = await import('@/lib/bookdate/helpers');
    const result = await callAI('custom', 'model', 'enc-key', '{}', 'http://custom');

    expect(result.recommendations).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
