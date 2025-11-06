import { describe, it, expect } from 'vitest';
import { parseListUrl } from './atproto';

describe('parseListUrl', () => {
  it('should parse valid Bluesky list URL to AT-URI', () => {
    const url = 'https://bsky.app/profile/offline.mountainherder.xyz/lists/3l7g3f6uyqo23';
    const result = parseListUrl(url);

    expect(result).toEqual({
      handle: 'offline.mountainherder.xyz',
      rkey: '3l7g3f6uyqo23'
    });
  });

  it('should handle URLs with DID instead of handle', () => {
    const url = 'https://bsky.app/profile/did:plc:abc123/lists/xyz789';
    const result = parseListUrl(url);

    expect(result).toEqual({
      handle: 'did:plc:abc123',
      rkey: 'xyz789'
    });
  });

  it('should throw error for invalid URL format', () => {
    const url = 'https://bsky.app/profile/handle';
    expect(() => parseListUrl(url)).toThrow('Invalid list URL format');
  });
});
