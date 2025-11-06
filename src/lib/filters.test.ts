import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyFilters } from './filters';
import { AtpAgent } from '@atproto/api';
import * as atproto from './atproto';
import type { JobFilters } from './kv';

vi.mock('./atproto');

describe('applyFilters', () => {
  let mockAgent: AtpAgent;

  beforeEach(() => {
    mockAgent = {
      session: {
        did: 'did:plc:user123',
        handle: 'user.bsky.social',
        email: 'user@example.com',
        emailConfirmed: true,
        emailAuthFactor: false,
        accessJwt: 'mock-access-jwt',
        refreshJwt: 'mock-refresh-jwt',
        active: true
      }
    } as unknown as AtpAgent;
    vi.clearAllMocks();
  });

  it('should return all DIDs when no filters are applied', async () => {
    const allDids = ['did:plc:1', 'did:plc:2', 'did:plc:3'];
    const filters: JobFilters = {
      excludeFollows: false,
      excludeMutuals: false,
      excludeListUris: []
    };

    const result = await applyFilters(allDids, filters, mockAgent);

    expect(result).toEqual(allDids);
  });

  it('should exclude follows when excludeFollows is true', async () => {
    const allDids = ['did:plc:1', 'did:plc:2', 'did:plc:3', 'did:plc:4'];
    const filters: JobFilters = {
      excludeFollows: true,
      excludeMutuals: false,
      excludeListUris: []
    };

    vi.mocked(atproto.getUserFollows).mockResolvedValue(['did:plc:2', 'did:plc:4']);

    const result = await applyFilters(allDids, filters, mockAgent);

    expect(atproto.getUserFollows).toHaveBeenCalledWith(mockAgent, 'did:plc:user123');
    expect(result).toEqual(['did:plc:1', 'did:plc:3']);
  });

  it('should exclude mutuals when excludeMutuals is true', async () => {
    const allDids = ['did:plc:1', 'did:plc:2', 'did:plc:3', 'did:plc:4'];
    const filters: JobFilters = {
      excludeFollows: false,
      excludeMutuals: true,
      excludeListUris: []
    };

    vi.mocked(atproto.getUserMutuals).mockResolvedValue(['did:plc:1', 'did:plc:3']);

    const result = await applyFilters(allDids, filters, mockAgent);

    expect(atproto.getUserMutuals).toHaveBeenCalledWith(mockAgent, 'did:plc:user123');
    expect(result).toEqual(['did:plc:2', 'did:plc:4']);
  });

  it('should exclude members from specified lists', async () => {
    const allDids = ['did:plc:1', 'did:plc:2', 'did:plc:3', 'did:plc:4', 'did:plc:5'];
    const filters: JobFilters = {
      excludeFollows: false,
      excludeMutuals: false,
      excludeListUris: ['at://did:plc:user123/app.bsky.graph.list/abc123']
    };

    vi.mocked(atproto.fetchListMembers).mockResolvedValue(['did:plc:2', 'did:plc:5']);

    const result = await applyFilters(allDids, filters, mockAgent);

    expect(atproto.fetchListMembers).toHaveBeenCalledWith(
      mockAgent,
      'at://did:plc:user123/app.bsky.graph.list/abc123'
    );
    expect(result).toEqual(['did:plc:1', 'did:plc:3', 'did:plc:4']);
  });

  it('should exclude members from multiple lists', async () => {
    const allDids = ['did:plc:1', 'did:plc:2', 'did:plc:3', 'did:plc:4', 'did:plc:5'];
    const filters: JobFilters = {
      excludeFollows: false,
      excludeMutuals: false,
      excludeListUris: [
        'at://did:plc:user123/app.bsky.graph.list/abc123',
        'at://did:plc:user123/app.bsky.graph.list/def456'
      ]
    };

    vi.mocked(atproto.fetchListMembers)
      .mockResolvedValueOnce(['did:plc:2', 'did:plc:5'])
      .mockResolvedValueOnce(['did:plc:3']);

    const result = await applyFilters(allDids, filters, mockAgent);

    expect(atproto.fetchListMembers).toHaveBeenCalledTimes(2);
    expect(result).toEqual(['did:plc:1', 'did:plc:4']);
  });

  it('should combine all filters correctly', async () => {
    const allDids = ['did:plc:1', 'did:plc:2', 'did:plc:3', 'did:plc:4', 'did:plc:5', 'did:plc:6'];
    const filters: JobFilters = {
      excludeFollows: true,
      excludeMutuals: true,
      excludeListUris: ['at://did:plc:user123/app.bsky.graph.list/abc123']
    };

    vi.mocked(atproto.getUserFollows).mockResolvedValue(['did:plc:2']);
    vi.mocked(atproto.getUserMutuals).mockResolvedValue(['did:plc:3']);
    vi.mocked(atproto.fetchListMembers).mockResolvedValue(['did:plc:4']);

    const result = await applyFilters(allDids, filters, mockAgent);

    expect(result).toEqual(['did:plc:1', 'did:plc:5', 'did:plc:6']);
  });

  it('should handle empty exclude lists gracefully', async () => {
    const allDids = ['did:plc:1', 'did:plc:2'];
    const filters: JobFilters = {
      excludeFollows: false,
      excludeMutuals: false,
      excludeListUris: []
    };

    const result = await applyFilters(allDids, filters, mockAgent);

    expect(result).toEqual(allDids);
    expect(atproto.getUserFollows).not.toHaveBeenCalled();
    expect(atproto.getUserMutuals).not.toHaveBeenCalled();
    expect(atproto.fetchListMembers).not.toHaveBeenCalled();
  });
});
