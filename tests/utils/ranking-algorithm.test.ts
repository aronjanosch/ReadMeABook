/**
 * Component: Intelligent Ranking Algorithm Tests
 * Documentation: documentation/phase3/ranking-algorithm.md
 */

import { describe, expect, it } from 'vitest';
import { RankingAlgorithm, rankTorrents } from '@/lib/utils/ranking-algorithm';

const MB = 1024 * 1024;

describe('ranking-algorithm', () => {
  const baseTorrent = {
    indexer: 'IndexerA',
    title: 'Great Book - Author Name',
    size: 30 * MB,
    seeders: 10,
    leechers: 1,
    publishDate: new Date('2024-01-01T00:00:00Z'),
    downloadUrl: 'magnet:?xt=urn:btih:abc',
    guid: 'guid-1',
  };

  it('filters out results below 20 MB', () => {
    const small = { ...baseTorrent, guid: 'small', size: 10 * MB };
    const big = { ...baseTorrent, guid: 'big', size: 25 * MB };

    const ranked = rankTorrents(
      [small, big],
      { title: 'Great Book', author: 'Author Name' }
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0].guid).toBe('big');
  });

  it('prefers strong title/author matches over weaker ones', () => {
    const good = { ...baseTorrent, guid: 'good', title: 'Great Book - Author Name' };
    const bad = { ...baseTorrent, guid: 'bad', title: 'Different Title - Other Author' };

    const ranked = rankTorrents(
      [bad, good],
      { title: 'Great Book', author: 'Author Name' }
    );

    expect(ranked[0].guid).toBe('good');
  });

  it('treats undefined seeders as full availability score (usenet)', () => {
    const algorithm = new RankingAlgorithm();
    const torrent = { ...baseTorrent, seeders: undefined };

    const breakdown = algorithm.getScoreBreakdown(torrent, {
      title: 'Great Book',
      author: 'Author Name',
    });

    expect(breakdown.seederScore).toBe(15);
  });

  it('assigns full size score for >= 1.0 MB/min', () => {
    const algorithm = new RankingAlgorithm();
    const torrent = { ...baseTorrent, size: 150 * MB };

    const breakdown = algorithm.getScoreBreakdown(torrent, {
      title: 'Great Book',
      author: 'Author Name',
      durationMinutes: 100,
    });

    expect(breakdown.sizeScore).toBe(15);
  });

  it('applies word coverage filter for partial title matches', () => {
    const algorithm = new RankingAlgorithm();
    const torrent = { ...baseTorrent, title: 'The Wild Robot' };

    const breakdown = algorithm.getScoreBreakdown(torrent, {
      title: 'The Wild Robot on the Island',
      author: 'Peter Brown',
    });

    expect(breakdown.matchScore).toBe(0);
  });

  it('adds seeder availability notes and weak match notes', () => {
    const algorithm = new RankingAlgorithm();
    const baseBreakdown = {
      formatScore: 0,
      sizeScore: 0,
      seederScore: 0,
      matchScore: 30,
      totalScore: 30,
      notes: [],
    };

    const noSeeders = (algorithm as any).generateNotes(
      { ...baseTorrent, seeders: 0 },
      baseBreakdown,
      120
    );
    expect(noSeeders.some((note: string) => note.includes('No seeders'))).toBe(true);
    expect(noSeeders.some((note: string) => note.includes('Weak title/author match'))).toBe(true);

    const lowSeeders = (algorithm as any).generateNotes(
      { ...baseTorrent, seeders: 3 },
      baseBreakdown,
      120
    );
    expect(lowSeeders.some((note: string) => note.includes('Low seeders'))).toBe(true);

    const highSeeders = (algorithm as any).generateNotes(
      { ...baseTorrent, seeders: 50 },
      baseBreakdown,
      120
    );
    expect(highSeeders.some((note: string) => note.includes('Excellent availability'))).toBe(true);
  });

  it('adds format and size quality notes for MP3 files', () => {
    const algorithm = new RankingAlgorithm();
    const breakdown = {
      formatScore: 0,
      sizeScore: 0,
      seederScore: 0,
      matchScore: 50,
      totalScore: 50,
      notes: [],
    };

    const highQuality = (algorithm as any).generateNotes(
      { ...baseTorrent, format: 'MP3', size: 70 * MB },
      breakdown,
      60
    );
    expect(highQuality.some((note: string) => note.includes('Acceptable format'))).toBe(true);
    expect(highQuality.some((note: string) => note.includes('High quality'))).toBe(true);

    const standardQuality = (algorithm as any).generateNotes(
      { ...baseTorrent, format: 'MP3', size: 30 * MB },
      breakdown,
      60
    );
    expect(standardQuality.some((note: string) => note.includes('Standard quality'))).toBe(true);

    const lowQuality = (algorithm as any).generateNotes(
      { ...baseTorrent, format: 'MP3', size: 20 * MB },
      breakdown,
      60
    );
    expect(lowQuality.some((note: string) => note.includes('Low quality'))).toBe(true);
  });
});


