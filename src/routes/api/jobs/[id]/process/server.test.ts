import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import * as atproto from '$lib/atproto';
import * as filters from '$lib/filters';
import * as kv from '$lib/kv';
import { AtpAgent } from '@atproto/api';
import type { Job } from '$lib/kv';

vi.mock('$lib/atproto');
vi.mock('$lib/filters');
vi.mock('$lib/kv');
vi.mock('@atproto/api');

describe('POST /api/jobs/[id]/process', () => {
  const mockJobId = 'test-job-123';
  const mockJob: Job = {
    id: mockJobId,
    status: 'pending',
    session: {
      did: 'did:plc:user123',
      handle: 'user.bsky.social',
      accessJwt: 'mock-access-jwt',
      refreshJwt: 'mock-refresh-jwt'
    },
    sourceListUri: 'at://did:plc:source/app.bsky.graph.list/source123',
    destListName: 'Cloned List',
    filters: {
      excludeFollows: false,
      excludeMutuals: false,
      excludeListUris: []
    },
    progress: { current: 0, total: 0 },
    errors: [],
    createdAt: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 when job does not exist', async () => {
    vi.mocked(kv.getJob).mockResolvedValue(null);

    const response = await POST({ params: { id: 'non-existent-job' } });
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should process job without filters and return completed status', async () => {
    const sourceMembers = ['did:plc:1', 'did:plc:2', 'did:plc:3'];
    const mockDestListUri = 'at://did:plc:user123/app.bsky.graph.list/dest123';

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);
    vi.mocked(kv.updateJob).mockResolvedValue(mockJob);
    vi.mocked(atproto.fetchListMembers).mockResolvedValue(sourceMembers);
    vi.mocked(filters.applyFilters).mockResolvedValue(sourceMembers);
    vi.mocked(atproto.createList).mockResolvedValue(mockDestListUri);
    vi.mocked(atproto.addListMembers).mockResolvedValue({
      successful: 3,
      failed: 0,
      errors: []
    });

    const mockAgent = {
      session: mockJob.session
    } as unknown as AtpAgent;
    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    const response = await POST({ params: { id: mockJobId } });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('completed');
    expect(data.progress).toEqual({ current: 3, total: 3 });

    expect(kv.updateJob).toHaveBeenCalledWith(mockJobId, {
      status: 'processing'
    });

    expect(kv.updateJob).toHaveBeenCalledWith(mockJobId, {
      progress: { current: 0, total: 3 }
    });

    expect(kv.updateJob).toHaveBeenCalledWith(mockJobId, {
      destListUri: mockDestListUri
    });

    const completedCall = vi.mocked(kv.updateJob).mock.calls.find(
      call => call[1].status === 'completed'
    );
    expect(completedCall).toBeDefined();
    expect(completedCall?.[1].completedAt).toBeDefined();
  });

  it('should apply filters before adding members', async () => {
    const sourceMembers = ['did:plc:1', 'did:plc:2', 'did:plc:3', 'did:plc:4'];
    const filteredMembers = ['did:plc:1', 'did:plc:3'];
    const mockDestListUri = 'at://did:plc:user123/app.bsky.graph.list/dest123';

    const jobWithFilters = {
      ...mockJob,
      filters: {
        excludeFollows: true,
        excludeMutuals: false,
        excludeListUris: []
      }
    };

    vi.mocked(kv.getJob).mockResolvedValue(jobWithFilters);
    vi.mocked(kv.updateJob).mockResolvedValue(jobWithFilters);
    vi.mocked(atproto.fetchListMembers).mockResolvedValue(sourceMembers);
    vi.mocked(filters.applyFilters).mockResolvedValue(filteredMembers);
    vi.mocked(atproto.createList).mockResolvedValue(mockDestListUri);
    vi.mocked(atproto.addListMembers).mockResolvedValue({
      successful: 2,
      failed: 0,
      errors: []
    });

    const mockAgent = {
      session: jobWithFilters.session
    } as unknown as AtpAgent;
    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    const response = await POST({ params: { id: mockJobId } });
    expect(response.status).toBe(200);

    expect(filters.applyFilters).toHaveBeenCalledWith(
      sourceMembers,
      jobWithFilters.filters,
      mockAgent
    );

    expect(atproto.addListMembers).toHaveBeenCalledWith(
      mockAgent,
      mockDestListUri,
      filteredMembers,
      25
    );
  });

  it('should track individual member errors but continue processing', async () => {
    const sourceMembers = ['did:plc:1', 'did:plc:2', 'did:plc:3'];
    const mockDestListUri = 'at://did:plc:user123/app.bsky.graph.list/dest123';

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);
    vi.mocked(kv.updateJob).mockResolvedValue(mockJob);
    vi.mocked(atproto.fetchListMembers).mockResolvedValue(sourceMembers);
    vi.mocked(filters.applyFilters).mockResolvedValue(sourceMembers);
    vi.mocked(atproto.createList).mockResolvedValue(mockDestListUri);
    vi.mocked(atproto.addListMembers).mockResolvedValue({
      successful: 2,
      failed: 1,
      errors: [{ did: 'did:plc:2', error: 'Rate limit exceeded' }]
    });

    const mockAgent = {
      session: mockJob.session
    } as unknown as AtpAgent;
    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    const response = await POST({ params: { id: mockJobId } });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('completed');

    const errorUpdateCall = vi.mocked(kv.updateJob).mock.calls.find(
      call => call[1].errors !== undefined
    );
    expect(errorUpdateCall).toBeDefined();
    expect(errorUpdateCall?.[1].errors).toEqual([
      { did: 'did:plc:2', error: 'Rate limit exceeded' }
    ]);
  });

  it('should update progress as batches complete', async () => {
    const sourceMembers = Array.from({ length: 50 }, (_, i) => `did:plc:${i}`);
    const mockDestListUri = 'at://did:plc:user123/app.bsky.graph.list/dest123';

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);
    vi.mocked(kv.updateJob).mockResolvedValue(mockJob);
    vi.mocked(atproto.fetchListMembers).mockResolvedValue(sourceMembers);
    vi.mocked(filters.applyFilters).mockResolvedValue(sourceMembers);
    vi.mocked(atproto.createList).mockResolvedValue(mockDestListUri);
    vi.mocked(atproto.addListMembers).mockResolvedValue({
      successful: 50,
      failed: 0,
      errors: []
    });

    const mockAgent = {
      session: mockJob.session
    } as unknown as AtpAgent;
    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    const response = await POST({ params: { id: mockJobId } });
    expect(response.status).toBe(200);

    const progressUpdateCalls = vi.mocked(kv.updateJob).mock.calls.filter(
      call => call[1].progress !== undefined
    );
    expect(progressUpdateCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('should fail job on authentication error', async () => {
    const sourceMembers = ['did:plc:1', 'did:plc:2'];

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);
    vi.mocked(kv.updateJob).mockResolvedValue(mockJob);
    vi.mocked(atproto.fetchListMembers).mockResolvedValue(sourceMembers);
    vi.mocked(filters.applyFilters).mockResolvedValue(sourceMembers);
    vi.mocked(atproto.createList).mockRejectedValue(
      new Error('Agent must be authenticated to create lists')
    );

    const mockAgent = {
      session: mockJob.session
    } as unknown as AtpAgent;
    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    const response = await POST({ params: { id: mockJobId } });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('failed');

    const failedCall = vi.mocked(kv.updateJob).mock.calls.find(
      call => call[1].status === 'failed'
    );
    expect(failedCall).toBeDefined();
  });

  it('should fail job on list creation error', async () => {
    const sourceMembers = ['did:plc:1', 'did:plc:2'];

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);
    vi.mocked(kv.updateJob).mockResolvedValue(mockJob);
    vi.mocked(atproto.fetchListMembers).mockResolvedValue(sourceMembers);
    vi.mocked(filters.applyFilters).mockResolvedValue(sourceMembers);
    vi.mocked(atproto.createList).mockRejectedValue(new Error('Failed to create list'));

    const mockAgent = {
      session: mockJob.session
    } as unknown as AtpAgent;
    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    const response = await POST({ params: { id: mockJobId } });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('failed');
  });

  it('should store destination list URI in job', async () => {
    const sourceMembers = ['did:plc:1'];
    const mockDestListUri = 'at://did:plc:user123/app.bsky.graph.list/dest123';

    vi.mocked(kv.getJob).mockResolvedValue(mockJob);
    vi.mocked(kv.updateJob).mockResolvedValue(mockJob);
    vi.mocked(atproto.fetchListMembers).mockResolvedValue(sourceMembers);
    vi.mocked(filters.applyFilters).mockResolvedValue(sourceMembers);
    vi.mocked(atproto.createList).mockResolvedValue(mockDestListUri);
    vi.mocked(atproto.addListMembers).mockResolvedValue({
      successful: 1,
      failed: 0,
      errors: []
    });

    const mockAgent = {
      session: mockJob.session
    } as unknown as AtpAgent;
    vi.mocked(AtpAgent).mockReturnValue(mockAgent);

    await POST({ params: { id: mockJobId } });

    expect(kv.updateJob).toHaveBeenCalledWith(mockJobId, {
      destListUri: mockDestListUri
    });
  });
});
