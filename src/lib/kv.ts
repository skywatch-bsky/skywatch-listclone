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
