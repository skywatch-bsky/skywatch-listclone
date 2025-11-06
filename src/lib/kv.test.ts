import { describe, it, expect } from 'vitest';
import type { Job } from './kv';
import { getKvClient, createJob } from './kv';

describe('Job type definitions', () => {
  it('should enforce required job fields', () => {
    const validJob: Job = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'pending',
      session: {
        did: 'did:plc:abc123',
        handle: 'test.bsky.social',
        accessJwt: 'jwt.access.token',
        refreshJwt: 'jwt.refresh.token'
      },
      sourceListUri: 'at://did:plc:abc/app.bsky.graph.list/123',
      destListName: 'My Cloned List',
      filters: {
        excludeFollows: false,
        excludeMutuals: false,
        excludeListUris: []
      },
      progress: { current: 0, total: 0 },
      errors: [],
      createdAt: new Date().toISOString()
    };

    expect(validJob.id).toBeTruthy();
    expect(validJob.status).toBe('pending');
  });

  it('should accept all valid status values', () => {
    const statuses: Array<'pending' | 'processing' | 'completed' | 'failed'> = [
      'pending',
      'processing',
      'completed',
      'failed'
    ];

    statuses.forEach(status => {
      const job: Job = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status,
        session: {
          did: 'did:plc:abc123',
          handle: 'test.bsky.social',
          accessJwt: 'jwt.access.token',
          refreshJwt: 'jwt.refresh.token'
        },
        sourceListUri: 'at://did:plc:abc/app.bsky.graph.list/123',
        destListName: 'Test List',
        filters: {
          excludeFollows: false,
          excludeMutuals: false,
          excludeListUris: []
        },
        progress: { current: 0, total: 0 },
        errors: [],
        createdAt: new Date().toISOString()
      };

      expect(job.status).toBe(status);
    });
  });

  it('should support optional fields', () => {
    const jobWithOptionals: Job = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'completed',
      session: {
        did: 'did:plc:abc123',
        handle: 'test.bsky.social',
        accessJwt: 'jwt.access.token',
        refreshJwt: 'jwt.refresh.token'
      },
      sourceListUri: 'at://did:plc:abc/app.bsky.graph.list/123',
      destListUri: 'at://did:plc:abc123/app.bsky.graph.list/456',
      destListName: 'Cloned List',
      filters: {
        excludeFollows: true,
        excludeMutuals: true,
        excludeListUris: ['at://did:plc:xyz/app.bsky.graph.list/789']
      },
      progress: { current: 100, total: 100 },
      errors: [{ did: 'did:plc:error', error: 'test error' }],
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    expect(jobWithOptionals.destListUri).toBeDefined();
    expect(jobWithOptionals.completedAt).toBeDefined();
    expect(jobWithOptionals.errors).toHaveLength(1);
  });
});

describe('getKvClient', () => {
  it('should return a KV client instance', () => {
    const client = getKvClient();

    expect(client).toBeDefined();
    expect(typeof client).toBe('object');
  });
});

describe('createJob', () => {
  it('should create a job with UUID and store in KV', async () => {
    const jobData = {
      session: {
        did: 'did:plc:test123',
        handle: 'test.bsky.social',
        accessJwt: 'access.token',
        refreshJwt: 'refresh.token'
      },
      sourceListUri: 'at://did:plc:test/app.bsky.graph.list/abc',
      destListName: 'Test List',
      filters: {
        excludeFollows: true,
        excludeMutuals: false,
        excludeListUris: []
      }
    };

    const job = await createJob(jobData);

    expect(job.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(job.status).toBe('pending');
    expect(job.progress).toEqual({ current: 0, total: 0 });
    expect(job.errors).toEqual([]);
    expect(job.createdAt).toBeTruthy();
  });
});
