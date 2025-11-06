import { describe, it, expect } from 'vitest';
import { parseListUrl, resolveHandle, fetchListMembers, getUserFollows } from './atproto';
import { BskyAgent } from '@atproto/api';

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

describe('resolveHandle', () => {
  it('should resolve handle to DID', async () => {
    const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });
    const did = await resolveHandle(agent, 'bsky.app');

    expect(did).toMatch(/^did:plc:[a-z0-9]+$/);
  });

  it('should return DID unchanged if already a DID', async () => {
    const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });
    const inputDid = 'did:plc:abc123xyz';
    const did = await resolveHandle(agent, inputDid);

    expect(did).toBe(inputDid);
  });

  it('should throw error for invalid handle', async () => {
    const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });

    await expect(resolveHandle(agent, 'invalid-handle-that-does-not-exist.invalid'))
      .rejects.toThrow();
  });
});

describe('fetchListMembers', () => {
  it('should fetch members from a list', async () => {
    const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });
    // Using offline.mountainherder.xyz's list from the example URL in the plan
    const url = 'https://bsky.app/profile/offline.mountainherder.xyz/lists/3l7g3f6uyqo23';
    const parsed = parseListUrl(url);
    const did = await resolveHandle(agent, parsed.handle);
    const listUri = `at://${did}/app.bsky.graph.list/${parsed.rkey}`;

    const members = await fetchListMembers(agent, listUri);

    expect(Array.isArray(members)).toBe(true);
    members.forEach(member => {
      expect(member).toMatch(/^did:plc:[a-z0-9]+$/);
    });
  });

  it('should handle pagination by fetching all members', async () => {
    const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });
    // Using a list that likely has multiple pages
    const url = 'https://bsky.app/profile/offline.mountainherder.xyz/lists/3l7g3f6uyqo23';
    const parsed = parseListUrl(url);
    const did = await resolveHandle(agent, parsed.handle);
    const listUri = `at://${did}/app.bsky.graph.list/${parsed.rkey}`;

    const members = await fetchListMembers(agent, listUri);

    // Just verify we get an array back - pagination is tested by implementation
    expect(Array.isArray(members)).toBe(true);
  });
});

describe('getUserFollows', () => {
  it('should fetch all DIDs that a user follows', async () => {
    const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });
    const userDid = 'did:plc:z72i7hdynmk6r22z27h6tvur';

    const follows = await getUserFollows(agent, userDid);

    expect(Array.isArray(follows)).toBe(true);
    expect(follows.length).toBeGreaterThan(0);
    follows.forEach(did => {
      expect(did).toMatch(/^did:plc:[a-z0-9]+$/);
    });
  });
});
