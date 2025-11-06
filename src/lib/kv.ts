import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobSession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
}

export interface JobFilters {
  excludeFollows: boolean;
  excludeMutuals: boolean;
  excludeListUris: string[];
}

export interface JobProgress {
  current: number;
  total: number;
}

export interface JobError {
  did: string;
  error: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  session: JobSession;
  sourceListUri: string;
  destListUri?: string;
  destListName: string;
  filters: JobFilters;
  progress: JobProgress;
  errors: JobError[];
  createdAt: string;
  completedAt?: string;
}

export function getKvClient() {
  return kv;
}

export interface CreateJobData {
  session: JobSession;
  sourceListUri: string;
  destListName: string;
  filters: JobFilters;
}

export async function createJob(data: CreateJobData): Promise<Job> {
  const job: Job = {
    id: randomUUID(),
    status: 'pending',
    session: data.session,
    sourceListUri: data.sourceListUri,
    destListName: data.destListName,
    filters: data.filters,
    progress: { current: 0, total: 0 },
    errors: [],
    createdAt: new Date().toISOString()
  };

  const client = getKvClient();
  const ttl = 60 * 60 * 24 * 7;

  await client.set(`job:${job.id}`, JSON.stringify(job), { ex: ttl });

  return job;
}
