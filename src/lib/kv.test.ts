import { describe, it, expect } from 'vitest';
import type { Job } from './kv';

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
