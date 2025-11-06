import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import * as atproto from '$lib/atproto';
import * as kv from '$lib/kv';
import { AtpAgent } from '@atproto/api';

vi.mock('$lib/atproto');
vi.mock('$lib/kv');
vi.mock('@atproto/api');

describe('POST /api/clone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when sourceListUrl is missing', async () => {
    const request = new Request('http://localhost/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destListName: 'My List',
        handle: 'test.bsky.social',
        password: 'test-password',
        filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] }
      })
    });

    const response = await POST({ request });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('sourceListUrl');
  });

  it('should return 400 when destListName is missing', async () => {
    const request = new Request('http://localhost/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceListUrl: 'https://bsky.app/profile/test/lists/abc',
        handle: 'test.bsky.social',
        password: 'test-password',
        filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] }
      })
    });

    const response = await POST({ request });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('destListName');
  });

  it('should return 400 when handle is missing', async () => {
    const request = new Request('http://localhost/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceListUrl: 'https://bsky.app/profile/test/lists/abc',
        destListName: 'My List',
        password: 'test-password',
        filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] }
      })
    });

    const response = await POST({ request });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('handle');
  });

  it('should return 400 when password is missing', async () => {
    const request = new Request('http://localhost/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceListUrl: 'https://bsky.app/profile/test/lists/abc',
        destListName: 'My List',
        handle: 'test.bsky.social',
        filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] }
      })
    });

    const response = await POST({ request });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('password');
  });

  it('should return 400 when filters is missing', async () => {
    const request = new Request('http://localhost/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceListUrl: 'https://bsky.app/profile/test/lists/abc',
        destListName: 'My List',
        handle: 'test.bsky.social',
        password: 'test-password'
      })
    });

    const response = await POST({ request });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('filters');
  });

  it('should return 400 when sourceListUrl is invalid format', async () => {
    vi.mocked(atproto.parseListUrl).mockImplementation(() => {
      throw new Error('Invalid list URL format');
    });

    const request = new Request('http://localhost/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceListUrl: 'not-a-valid-url',
        destListName: 'My List',
        handle: 'test.bsky.social',
        password: 'test-password',
        filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] }
      })
    });

    const response = await POST({ request });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Invalid list URL');
  });

  it('should return 401 when authentication fails', async () => {
    vi.mocked(atproto.parseListUrl).mockReturnValue({
      handle: 'test.bsky.social',
      rkey: 'abc123'
    });

    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    const mockAgent = {
      login: mockLogin,
      session: null
    } as unknown as AtpAgent;

    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    const request = new Request('http://localhost/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceListUrl: 'https://bsky.app/profile/test/lists/abc',
        destListName: 'My List',
        handle: 'test.bsky.social',
        password: 'wrong-password',
        filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] }
      })
    });

    const response = await POST({ request });
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should create job and return jobId on success', async () => {
    vi.mocked(atproto.parseListUrl).mockReturnValue({
      handle: 'test.bsky.social',
      rkey: 'abc123'
    });

    vi.mocked(atproto.resolveHandle).mockResolvedValue('did:plc:test123');

    const mockSession = {
      did: 'did:plc:user123',
      handle: 'test.bsky.social',
      accessJwt: 'access-token',
      refreshJwt: 'refresh-token'
    };

    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockAgent = {
      login: mockLogin,
      session: mockSession
    } as unknown as AtpAgent;

    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    const mockJob = {
      id: 'job-123',
      status: 'pending' as const,
      session: {
        did: mockSession.did,
        handle: mockSession.handle,
        accessJwt: mockSession.accessJwt,
        refreshJwt: mockSession.refreshJwt
      },
      sourceListUri: 'at://did:plc:test123/app.bsky.graph.list/abc123',
      destListName: 'My List',
      filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] },
      progress: { current: 0, total: 0 },
      errors: [],
      createdAt: new Date().toISOString()
    };

    vi.mocked(kv.createJob).mockResolvedValue(mockJob);

    const request = new Request('http://localhost/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceListUrl: 'https://bsky.app/profile/test/lists/abc',
        destListName: 'My List',
        handle: 'test.bsky.social',
        password: 'test-password',
        filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] }
      })
    });

    const response = await POST({ request });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.jobId).toBe('job-123');

    expect(mockLogin).toHaveBeenCalledWith({
      identifier: 'test.bsky.social',
      password: 'test-password'
    });

    expect(vi.mocked(atproto.resolveHandle)).toHaveBeenCalledWith(
      mockAgent,
      'test.bsky.social'
    );

    expect(vi.mocked(kv.createJob)).toHaveBeenCalledWith({
      session: {
        did: mockSession.did,
        handle: mockSession.handle,
        accessJwt: mockSession.accessJwt,
        refreshJwt: mockSession.refreshJwt
      },
      sourceListUri: 'at://did:plc:test123/app.bsky.graph.list/abc123',
      destListName: 'My List',
      filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] }
    });
  });

  it('should return 500 for unexpected errors', async () => {
    vi.mocked(atproto.parseListUrl).mockReturnValue({
      handle: 'test.bsky.social',
      rkey: 'abc123'
    });

    vi.mocked(atproto.resolveHandle).mockRejectedValue(new Error('Unexpected error'));

    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockAgent = {
      login: mockLogin,
      session: {
        did: 'did:plc:user123',
        handle: 'test.bsky.social',
        accessJwt: 'access-token',
        refreshJwt: 'refresh-token'
      }
    } as unknown as AtpAgent;

    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    const request = new Request('http://localhost/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceListUrl: 'https://bsky.app/profile/test/lists/abc',
        destListName: 'My List',
        handle: 'test.bsky.social',
        password: 'test-password',
        filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] }
      })
    });

    const response = await POST({ request });
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
