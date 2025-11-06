import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import * as kv from '$lib/kv';
import type { Job } from '$lib/kv';

vi.mock('$lib/kv');

describe('GET /api/jobs/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 when job does not exist', async () => {
    vi.mocked(kv.getJob).mockResolvedValue(null);

    const request = new Request('http://localhost/api/jobs/nonexistent/status');
    const params = { id: 'nonexistent' };

    const response = await GET({ request, params });
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should return job status without session tokens', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'processing',
      session: {
        did: 'did:plc:user123',
        handle: 'test.bsky.social',
        accessJwt: 'secret-access-token',
        refreshJwt: 'secret-refresh-token'
      },
      sourceListUri: 'at://did:plc:test123/app.bsky.graph.list/abc123',
      destListName: 'My List',
      filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] },
      progress: { current: 50, total: 100 },
      errors: [],
      createdAt: '2025-01-01T00:00:00.000Z'
    };

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);

    const request = new Request('http://localhost/api/jobs/job-123/status');
    const params = { id: 'job-123' };

    const response = await GET({ request, params });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      id: 'job-123',
      status: 'processing',
      progress: { current: 50, total: 100 },
      errors: [],
      createdAt: '2025-01-01T00:00:00.000Z'
    });
    expect(data.session).toBeUndefined();
  });

  it('should include destListUri when job is completed', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'completed',
      session: {
        did: 'did:plc:user123',
        handle: 'test.bsky.social',
        accessJwt: 'secret-access-token',
        refreshJwt: 'secret-refresh-token'
      },
      sourceListUri: 'at://did:plc:test123/app.bsky.graph.list/abc123',
      destListUri: 'at://did:plc:user123/app.bsky.graph.list/xyz789',
      destListName: 'My List',
      filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] },
      progress: { current: 100, total: 100 },
      errors: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      completedAt: '2025-01-01T00:05:00.000Z'
    };

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);

    const request = new Request('http://localhost/api/jobs/job-123/status');
    const params = { id: 'job-123' };

    const response = await GET({ request, params });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      id: 'job-123',
      status: 'completed',
      progress: { current: 100, total: 100 },
      errors: [],
      destListUri: 'at://did:plc:user123/app.bsky.graph.list/xyz789',
      createdAt: '2025-01-01T00:00:00.000Z',
      completedAt: '2025-01-01T00:05:00.000Z'
    });
    expect(data.session).toBeUndefined();
  });

  it('should include errors when job has failed items', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'completed',
      session: {
        did: 'did:plc:user123',
        handle: 'test.bsky.social',
        accessJwt: 'secret-access-token',
        refreshJwt: 'secret-refresh-token'
      },
      sourceListUri: 'at://did:plc:test123/app.bsky.graph.list/abc123',
      destListUri: 'at://did:plc:user123/app.bsky.graph.list/xyz789',
      destListName: 'My List',
      filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] },
      progress: { current: 100, total: 100 },
      errors: [
        { did: 'did:plc:error1', error: 'Rate limited' },
        { did: 'did:plc:error2', error: 'User blocked you' }
      ],
      createdAt: '2025-01-01T00:00:00.000Z',
      completedAt: '2025-01-01T00:05:00.000Z'
    };

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);

    const request = new Request('http://localhost/api/jobs/job-123/status');
    const params = { id: 'job-123' };

    const response = await GET({ request, params });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.errors).toHaveLength(2);
    expect(data.errors).toEqual([
      { did: 'did:plc:error1', error: 'Rate limited' },
      { did: 'did:plc:error2', error: 'User blocked you' }
    ]);
  });

  it('should handle pending status', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'pending',
      session: {
        did: 'did:plc:user123',
        handle: 'test.bsky.social',
        accessJwt: 'secret-access-token',
        refreshJwt: 'secret-refresh-token'
      },
      sourceListUri: 'at://did:plc:test123/app.bsky.graph.list/abc123',
      destListName: 'My List',
      filters: { excludeFollows: false, excludeMutuals: false, excludeListUris: [] },
      progress: { current: 0, total: 0 },
      errors: [],
      createdAt: '2025-01-01T00:00:00.000Z'
    };

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);

    const request = new Request('http://localhost/api/jobs/job-123/status');
    const params = { id: 'job-123' };

    const response = await GET({ request, params });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('pending');
    expect(data.progress).toEqual({ current: 0, total: 0 });
  });
});
