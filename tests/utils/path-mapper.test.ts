/**
 * Component: Path Mapper Tests
 * Documentation: documentation/phase3/qbittorrent.md
 */

import { describe, expect, it } from 'vitest';
import { PathMapper } from '@/lib/utils/path-mapper';

describe('PathMapper', () => {
  it('returns original path when mapping is disabled', () => {
    const result = PathMapper.transform('/remote/path/book', {
      enabled: false,
      remotePath: '/remote/path',
      localPath: '/local/path',
    });

    expect(result).toBe('/remote/path/book');
  });

  it('transforms remote path to local path when enabled', () => {
    const result = PathMapper.transform('/remote/mnt/d/done/Book', {
      enabled: true,
      remotePath: '/remote/mnt/d/done',
      localPath: '/downloads',
    });

    expect(result.replace(/\\/g, '/')).toBe('/downloads/Book');
  });

  it('returns original path when remote prefix does not match', () => {
    const result = PathMapper.transform('/other/path/book', {
      enabled: true,
      remotePath: '/remote/path',
      localPath: '/local/path',
    });

    expect(result).toBe('/other/path/book');
  });

  it('validates mapping configuration when enabled', () => {
    expect(() =>
      PathMapper.validate({ enabled: true, remotePath: '', localPath: '/local' })
    ).toThrow('Remote path cannot be empty');
    expect(() =>
      PathMapper.validate({ enabled: true, remotePath: '/remote', localPath: '' })
    ).toThrow('Local path cannot be empty');
  });
});


