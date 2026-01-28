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

  describe('Parenthetical/Bracketed Content Handling', () => {
    const algorithm = new RankingAlgorithm();

    it('matches "We Are Legion (We Are Bob)" when torrent omits subtitle', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Dennis E. Taylor - Bobiverse - 01 - We Are Legion',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'We Are Legion (We Are Bob)',
        author: 'Dennis E. Taylor',
      });

      // Should pass word coverage (required: "we", "are", "legion" all present)
      // Should get full title match (45 pts) + author match (15 pts)
      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('matches "We Are Legion (We Are Bob)" when torrent includes full title', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Dennis E. Taylor - We Are Legion (We Are Bob)',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'We Are Legion (We Are Bob)',
        author: 'Dennis E. Taylor',
      });

      // Should match full title with parentheses
      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('matches "Title [Series Name]" when torrent omits series in brackets', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Author Name - Title - Book One',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Title [Series Name]',
        author: 'Author Name',
      });

      // Required word is just "title", should match
      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('matches titles with curly braces as optional content', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Author - Book Title',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title {Extra Info}',
        author: 'Author',
      });

      expect(breakdown.matchScore).toBeGreaterThan(50);
    });
  });

  describe('Structured Metadata Prefix Handling', () => {
    const algorithm = new RankingAlgorithm();

    it('matches "Author - Series - 01 - Title" format correctly', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Brandon Sanderson - Mistborn - 01 - The Final Empire',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'The Final Empire',
        author: 'Brandon Sanderson',
      });

      // Should recognize structured prefix (preceded by " - ")
      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('rejects "This Inevitable Ruin Dungeon Crawler Carl" matching "Dungeon Crawler Carl"', () => {
      const torrent = {
        ...baseTorrent,
        title: 'This Inevitable Ruin Dungeon Crawler Carl',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Dungeon Crawler Carl',
        author: 'Matt Dinniman',
      });

      // Should NOT get full title match (45 pts) because of unstructured prefix
      // Should fall back to fuzzy matching (lower score)
      expect(breakdown.matchScore).toBeLessThan(45);
    });

    it('matches when author name is in prefix', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Brandon Sanderson The Way of Kings',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'The Way of Kings',
        author: 'Brandon Sanderson',
      });

      // Should recognize author in prefix as acceptable
      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('matches when title is preceded by colon separator', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Series Name: Book Title - Author',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Author',
      });

      expect(breakdown.matchScore).toBeGreaterThan(40);
    });

    it('matches when title is preceded by em-dash separator', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Author Name — Book Title',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Author Name',
      });

      expect(breakdown.matchScore).toBeGreaterThan(50);
    });
  });

  describe('Suffix Validation', () => {
    const algorithm = new RankingAlgorithm();

    it('rejects "The Housemaid\'s Secret" matching "The Housemaid"', () => {
      const torrent = {
        ...baseTorrent,
        title: 'The Housemaid\'s Secret - Freida McFadden',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'The Housemaid',
        author: 'Freida McFadden',
      });

      // Should NOT get full match because suffix continues with "'s Secret"
      // Should use fuzzy similarity instead
      expect(breakdown.matchScore).toBeLessThan(45);
    });

    it('matches when title is followed by " by Author"', () => {
      const torrent = {
        ...baseTorrent,
        title: 'The Great Book by Author Name',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'The Great Book',
        author: 'Author Name',
      });

      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('matches when title is followed by bracketed metadata', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Author - Book Title [Unabridged] (2024)',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Author',
      });

      expect(breakdown.matchScore).toBeGreaterThan(40);
    });

    it('matches when title is followed by author name with space', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Book Title John Smith 2024',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'John Smith',
      });

      // Should recognize author name in suffix
      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('matches when title is at end of string', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Author - Book Title',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Author',
      });

      expect(breakdown.matchScore).toBeGreaterThan(50);
    });
  });

  describe('Multi-Author Handling', () => {
    const algorithm = new RankingAlgorithm();

    it('splits authors on comma separator', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Book Title - Jane Doe, John Smith',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Jane Doe, John Smith',
      });

      // Should match both authors
      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('splits authors on ampersand separator', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Book Title - Jane Doe & John Smith',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Jane Doe & John Smith',
      });

      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('splits authors on "and" separator', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Book Title - Jane Doe and John Smith',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Jane Doe and John Smith',
      });

      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('filters out "translator" role', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Book Title - Jane Doe',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Jane Doe, translator',
      });

      // Should filter out "translator" and only match "Jane Doe"
      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('filters out "narrator" role', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Book Title - Jane Doe',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Jane Doe, narrator',
      });

      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('gives proportional credit for partial author matches', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Book Title - Jane Doe',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Jane Doe, John Smith, Alice Johnson',
      });

      // Should get 1/3 author credit (5 pts) + full title (45 pts) = 50 pts
      expect(breakdown.matchScore).toBeGreaterThanOrEqual(45);
      expect(breakdown.matchScore).toBeLessThan(60);
    });
  });

  describe('Bonus Modifiers', () => {
    it('applies indexer priority bonus correctly', () => {
      const torrent1 = { ...baseTorrent, guid: 'torrent1', indexerId: 1 };
      const torrent2 = { ...baseTorrent, guid: 'torrent2', indexerId: 2 };

      const priorities = new Map<number, number>([
        [1, 25], // Max priority (100%)
        [2, 10], // Default priority (40%)
      ]);

      const ranked = rankTorrents(
        [torrent1, torrent2],
        { title: 'Great Book', author: 'Author Name' },
        priorities
      );

      // torrent1 should rank higher due to priority bonus
      expect(ranked[0].guid).toBe('torrent1');
      expect(ranked[0].bonusModifiers.length).toBeGreaterThan(0);
      expect(ranked[0].bonusModifiers[0].type).toBe('indexer_priority');
      expect(ranked[0].finalScore).toBeGreaterThan(ranked[0].score);
    });

    it('applies positive flag bonus (Freeleech)', () => {
      const torrent = {
        ...baseTorrent,
        flags: ['Freeleech'],
        indexerId: 1,
      };

      const flagConfigs = [
        { name: 'Freeleech', modifier: 50 }, // +50% bonus
      ];

      const ranked = rankTorrents(
        [torrent],
        { title: 'Great Book', author: 'Author Name' },
        { flagConfigs }
      );

      const flagBonus = ranked[0].bonusModifiers.find(m => m.type === 'indexer_flag');
      expect(flagBonus).toBeDefined();
      expect(flagBonus!.value).toBe(0.5); // 50% = 0.5 multiplier
      expect(flagBonus!.points).toBeGreaterThan(0);
      expect(ranked[0].finalScore).toBeGreaterThan(ranked[0].score);
    });

    it('applies negative flag penalty', () => {
      const torrent = {
        ...baseTorrent,
        flags: ['Unwanted'],
        indexerId: 1,
      };

      const flagConfigs = [
        { name: 'Unwanted', modifier: -60 }, // -60% penalty
      ];

      const ranked = rankTorrents(
        [torrent],
        { title: 'Great Book', author: 'Author Name' },
        { flagConfigs }
      );

      const flagPenalty = ranked[0].bonusModifiers.find(m => m.type === 'indexer_flag');
      expect(flagPenalty).toBeDefined();
      expect(flagPenalty!.value).toBe(-0.6); // -60% = -0.6 multiplier
      expect(flagPenalty!.points).toBeLessThan(0);
      expect(ranked[0].finalScore).toBeLessThan(ranked[0].score);
    });

    it('stacks multiple flag bonuses additively', () => {
      const torrent = {
        ...baseTorrent,
        flags: ['Freeleech', 'Double Upload'],
        indexerId: 1,
      };

      const flagConfigs = [
        { name: 'Freeleech', modifier: 50 },
        { name: 'Double Upload', modifier: 25 },
      ];

      const ranked = rankTorrents(
        [torrent],
        { title: 'Great Book', author: 'Author Name' },
        { flagConfigs }
      );

      const flagBonuses = ranked[0].bonusModifiers.filter(m => m.type === 'indexer_flag');
      expect(flagBonuses.length).toBe(2);

      // Both bonuses should be positive
      expect(flagBonuses[0].points).toBeGreaterThan(0);
      expect(flagBonuses[1].points).toBeGreaterThan(0);

      // Total bonus should be sum of both
      expect(ranked[0].bonusPoints).toBeCloseTo(
        flagBonuses[0].points + flagBonuses[1].points + ranked[0].bonusModifiers.find(m => m.type === 'indexer_priority')!.points,
        1
      );
    });

    it('matches flags case-insensitively', () => {
      const torrent = {
        ...baseTorrent,
        flags: ['FREELEECH'],
        indexerId: 1,
      };

      const flagConfigs = [
        { name: 'freeleech', modifier: 50 },
      ];

      const ranked = rankTorrents(
        [torrent],
        { title: 'Great Book', author: 'Author Name' },
        { flagConfigs }
      );

      const flagBonus = ranked[0].bonusModifiers.find(m => m.type === 'indexer_flag');
      expect(flagBonus).toBeDefined();
    });

    it('trims whitespace when matching flags', () => {
      const torrent = {
        ...baseTorrent,
        flags: ['  Freeleech  '],
        indexerId: 1,
      };

      const flagConfigs = [
        { name: ' Freeleech ', modifier: 50 },
      ];

      const ranked = rankTorrents(
        [torrent],
        { title: 'Great Book', author: 'Author Name' },
        { flagConfigs }
      );

      const flagBonus = ranked[0].bonusModifiers.find(m => m.type === 'indexer_flag');
      expect(flagBonus).toBeDefined();
    });
  });

  describe('Tiebreaker Sorting', () => {
    it('prefers newer publish date when scores are equal', () => {
      const older = {
        ...baseTorrent,
        guid: 'older',
        publishDate: new Date('2023-01-01'),
      };
      const newer = {
        ...baseTorrent,
        guid: 'newer',
        publishDate: new Date('2024-01-01'),
      };

      const ranked = rankTorrents(
        [older, newer],
        { title: 'Great Book', author: 'Author Name' }
      );

      // Both should have same score, newer should rank #1
      expect(ranked[0].score).toBe(ranked[1].score);
      expect(ranked[0].guid).toBe('newer');
      expect(ranked[1].guid).toBe('older');
    });

    it('ignores publish date when scores differ', () => {
      const goodOld = {
        ...baseTorrent,
        guid: 'good-old',
        title: 'Great Book by Author Name',
        publishDate: new Date('2020-01-01'),
      };
      const badNew = {
        ...baseTorrent,
        guid: 'bad-new',
        title: 'Wrong Title',
        publishDate: new Date('2024-01-01'),
      };

      const ranked = rankTorrents(
        [badNew, goodOld],
        { title: 'Great Book', author: 'Author Name' }
      );

      // Better match should rank first despite being older
      expect(ranked[0].guid).toBe('good-old');
    });
  });

  describe('Word Coverage Edge Cases', () => {
    const algorithm = new RankingAlgorithm();

    it('filters stop words correctly', () => {
      const torrent = {
        ...baseTorrent,
        title: 'The Wild Robot - Peter Brown',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'The Wild Robot',
        author: 'Peter Brown',
      });

      // "the" is a stop word, so only "wild" and "robot" matter
      // Should get full title match (45) + author match (15) = 60
      expect(breakdown.matchScore).toBeGreaterThan(50);
    });

    it('requires 80% coverage of non-stop words', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Harry Potter',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Harry Potter and the Philosopher Stone',
        author: 'J.K. Rowling',
      });

      // Required words: "harry", "potter", "philosopher", "stone" (4 words)
      // Torrent has: "harry", "potter" (2/4 = 50%)
      // Should fail 80% threshold
      expect(breakdown.matchScore).toBe(0);
    });

    it('passes when 80% coverage is met', () => {
      const torrent = {
        ...baseTorrent,
        title: 'J.K. Rowling - Harry Potter Philosopher Stone',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Harry Potter and the Philosopher Stone',
        author: 'J.K. Rowling',
      });

      // Required words: "harry", "potter", "philosopher", "stone" (4 words)
      // "and" and "the" are stop words
      // Torrent has: all 4 words (100%)
      // Should pass
      expect(breakdown.matchScore).toBeGreaterThan(0);
    });

    it('handles titles with only stop words gracefully', () => {
      const torrent = {
        ...baseTorrent,
        title: 'The Book',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'The',
        author: 'Author',
      });

      // Should not crash, should fall through to fuzzy matching
      expect(breakdown.matchScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Format Detection', () => {
    const algorithm = new RankingAlgorithm();

    it('detects M4B format from title', () => {
      const torrent = { ...baseTorrent, title: 'Book Title [M4B]' };
      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Author',
      });

      expect(breakdown.formatScore).toBe(10); // M4B with chapters (default)
    });

    it('detects M4A format from title', () => {
      const torrent = { ...baseTorrent, title: 'Book Title [M4A]' };
      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Author',
      });

      expect(breakdown.formatScore).toBe(6);
    });

    it('detects MP3 format from title', () => {
      const torrent = { ...baseTorrent, title: 'Book Title [MP3]' };
      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Author',
      });

      expect(breakdown.formatScore).toBe(4);
    });

    it('uses explicit format field when provided', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Book Title',
        format: 'M4B' as const,
        hasChapters: true,
      };
      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Author',
      });

      expect(breakdown.formatScore).toBe(10);
    });

    it('reduces M4B score when hasChapters is false', () => {
      const torrent = {
        ...baseTorrent,
        format: 'M4B' as const,
        hasChapters: false,
      };
      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Author',
      });

      expect(breakdown.formatScore).toBe(9); // M4B without chapters
    });
  });

  describe('Author Presence Check (Automatic Mode)', () => {
    const algorithm = new RankingAlgorithm();

    it('rejects torrents with no author when requireAuthor: true', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Project Hail Mary [M4B]',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Project Hail Mary',
        author: 'Andy Weir',
      }, true);  // requireAuthor: true

      // No author → automatic rejection
      expect(breakdown.matchScore).toBe(0);
      expect(breakdown.totalScore).toBeLessThan(50);
    });

    it('accepts torrents with exact author match', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Andy Weir - Project Hail Mary [M4B]',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Project Hail Mary',
        author: 'Andy Weir',
      }, true);

      // Has author → should pass
      expect(breakdown.matchScore).toBeGreaterThan(0);
    });

    it('accepts torrents with middle initial variations', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Dennis E. Taylor - We Are Legion',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'We Are Legion',
        author: 'Dennis Taylor',  // No middle initial
      }, true);

      // Should match despite missing middle initial
      expect(breakdown.matchScore).toBeGreaterThan(0);
    });

    it('accepts torrents with name order variations', () => {
      // Torrent has first-last format
      const torrent1 = {
        ...baseTorrent,
        title: 'Andy Weir - Project Hail Mary',
      };

      const breakdown1 = algorithm.getScoreBreakdown(torrent1, {
        title: 'Project Hail Mary',
        author: 'Andy Weir',
      }, true);

      // Torrent has last,first format - should match via core components (andy + weir)
      const torrent2 = {
        ...baseTorrent,
        title: 'Weir, Andy - Project Hail Mary',
      };
      const breakdown2 = algorithm.getScoreBreakdown(torrent2, {
        title: 'Project Hail Mary',
        author: 'Andy Weir',
      }, true);

      expect(breakdown1.matchScore).toBeGreaterThan(0);
      expect(breakdown2.matchScore).toBeGreaterThan(0);
    });

    it('accepts torrents with reversed name order', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Sanderson, Brandon - The Way of Kings',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'The Way of Kings',
        author: 'Brandon Sanderson',  // First Last format
      }, true);

      // Should match "brandon" and "sanderson" within 30 chars
      expect(breakdown.matchScore).toBeGreaterThan(0);
    });

    it('rejects torrents with wrong author', () => {
      const torrent = {
        ...baseTorrent,
        title: 'John Smith - Harry Potter',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Harry Potter',
        author: 'J.K. Rowling',
      }, true);

      // Wrong author → rejection
      expect(breakdown.matchScore).toBe(0);
    });

    it('accepts when only one of multiple authors matches', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Jane Doe - Book Title',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Jane Doe, John Smith, Alice Johnson',  // Multiple authors
      }, true);

      // At least ONE author matches → should pass
      expect(breakdown.matchScore).toBeGreaterThan(0);
    });

    it('accepts full author name when request has additional middle name', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Brandon Sanderson - Mistborn',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Mistborn',
        author: 'Brandon R. Sanderson',  // Middle initial added
      }, true);

      // Core components (Brandon + Sanderson) present
      expect(breakdown.matchScore).toBeGreaterThan(0);
    });

    it('filters author roles before checking', () => {
      const torrent = {
        ...baseTorrent,
        title: 'Jane Doe - Book Title',
      };

      const breakdown = algorithm.getScoreBreakdown(torrent, {
        title: 'Book Title',
        author: 'Jane Doe, translator',  // Role should be filtered
      }, true);

      // Should match "Jane Doe" and ignore "translator"
      expect(breakdown.matchScore).toBeGreaterThan(0);
    });
  });

  describe('Author Presence Check (Interactive Mode)', () => {
    const algorithm = new RankingAlgorithm();

    it('shows all results when requireAuthor: false', () => {
      const noAuthor = {
        ...baseTorrent,
        guid: 'no-author',
        title: 'Project Hail Mary [M4B]',
      };

      const withAuthor = {
        ...baseTorrent,
        guid: 'with-author',
        title: 'Andy Weir - Project Hail Mary [M4B]',
      };

      const wrongAuthor = {
        ...baseTorrent,
        guid: 'wrong-author',
        title: 'John Smith - Project Hail Mary',
      };

      const ranked = rankTorrents(
        [noAuthor, withAuthor, wrongAuthor],
        { title: 'Project Hail Mary', author: 'Andy Weir' },
        { requireAuthor: false }  // Interactive mode
      );

      // All 3 should be in results
      expect(ranked).toHaveLength(3);

      // Correct author should rank first
      expect(ranked[0].guid).toBe('with-author');

      // Others should have lower scores but still visible
      expect(ranked.find(r => r.guid === 'no-author')).toBeDefined();
      expect(ranked.find(r => r.guid === 'wrong-author')).toBeDefined();
    });

    it('filters results when requireAuthor: true (automatic mode)', () => {
      const noAuthor = {
        ...baseTorrent,
        guid: 'no-author',
        title: 'Project Hail Mary [M4B]',
        size: 100 * MB,  // Above 20 MB threshold
      };

      const withAuthor = {
        ...baseTorrent,
        guid: 'with-author',
        title: 'Andy Weir - Project Hail Mary [M4B]',
        size: 100 * MB,
      };

      const wrongAuthor = {
        ...baseTorrent,
        guid: 'wrong-author',
        title: 'John Smith - Project Hail Mary',
        size: 100 * MB,
      };

      const ranked = rankTorrents(
        [noAuthor, withAuthor, wrongAuthor],
        { title: 'Project Hail Mary', author: 'Andy Weir' },
        { requireAuthor: true }  // Automatic mode (strict)
      );

      // Only correct author should have matchScore > 0
      const withMatch = ranked.filter(r => r.breakdown.matchScore > 0);
      expect(withMatch).toHaveLength(1);
      expect(withMatch[0].guid).toBe('with-author');

      // Others should have matchScore = 0 (rejected by author check)
      const noAuthorResult = ranked.find(r => r.guid === 'no-author');
      const wrongAuthorResult = ranked.find(r => r.guid === 'wrong-author');
      expect(noAuthorResult?.breakdown.matchScore).toBe(0);
      expect(wrongAuthorResult?.breakdown.matchScore).toBe(0);
    });

    it('defaults to requireAuthor: true when not specified', () => {
      const noAuthor = {
        ...baseTorrent,
        title: 'Project Hail Mary [M4B]',
      };

      const breakdown = algorithm.getScoreBreakdown(noAuthor, {
        title: 'Project Hail Mary',
        author: 'Andy Weir',
      });  // No requireAuthor parameter → defaults to true

      // Should reject (safe default)
      expect(breakdown.matchScore).toBe(0);
    });
  });

  describe('Legacy API Compatibility', () => {
    it('supports legacy rankTorrents signature with separate parameters', () => {
      const torrent = {
        ...baseTorrent,
        indexerId: 1,
        title: 'Andy Weir - Project Hail Mary',
      };

      const priorities = new Map<number, number>([[1, 20]]);
      const flags = [{ name: 'Freeleech', modifier: 50 }];

      // Legacy call: rankTorrents(torrents, audiobook, priorities, flags)
      const ranked = rankTorrents(
        [torrent],
        { title: 'Project Hail Mary', author: 'Andy Weir' },
        priorities,
        flags
      );

      expect(ranked).toHaveLength(1);
      expect(ranked[0].bonusModifiers.length).toBeGreaterThan(0);
    });

    it('supports new rankTorrents signature with options object', () => {
      const torrent = {
        ...baseTorrent,
        indexerId: 1,
        title: 'Andy Weir - Project Hail Mary',
      };

      const priorities = new Map<number, number>([[1, 20]]);
      const flags = [{ name: 'Freeleech', modifier: 50 }];

      // New call: rankTorrents(torrents, audiobook, options)
      const ranked = rankTorrents(
        [torrent],
        { title: 'Project Hail Mary', author: 'Andy Weir' },
        {
          indexerPriorities: priorities,
          flagConfigs: flags,
          requireAuthor: false
        }
      );

      expect(ranked).toHaveLength(1);
      expect(ranked[0].bonusModifiers.length).toBeGreaterThan(0);
    });
  });
});


