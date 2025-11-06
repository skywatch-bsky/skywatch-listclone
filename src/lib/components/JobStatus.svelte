<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { JobStatus as Status, JobProgress, JobError } from '$lib/kv';

  export let jobId: string;

  interface JobStatusResponse {
    id: string;
    status: Status;
    progress: JobProgress;
    errors: JobError[];
    destListUri?: string;
    createdAt: string;
    completedAt?: string;
  }

  let status: Status = 'pending';
  let progress: JobProgress = { current: 0, total: 0 };
  let errors: JobError[] = [];
  let destListUri: string | undefined;
  let loading = true;
  let error: string | undefined;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  async function fetchStatus() {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`);

      if (!response.ok) {
        if (response.status === 404) {
          error = 'Job not found';
          stopPolling();
          return;
        }
        throw new Error('Failed to fetch job status');
      }

      const data: JobStatusResponse = await response.json();
      status = data.status;
      progress = data.progress;
      errors = data.errors;
      destListUri = data.destListUri;
      loading = false;

      if (status === 'completed' || status === 'failed') {
        stopPolling();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      loading = false;
      stopPolling();
    }
  }

  function startPolling() {
    fetchStatus();
    pollInterval = setInterval(fetchStatus, 2000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  onMount(() => {
    startPolling();
  });

  onDestroy(() => {
    stopPolling();
  });

  function getStatusColor(s: Status): string {
    switch (s) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
    }
  }

  function getProgressPercent(): number {
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  }

  function formatListUrl(uri: string): string {
    const match = uri.match(/at:\/\/(did:plc:[^/]+)\/app\.bsky\.graph\.list\/(.+)/);
    if (!match) return uri;
    const [, did, rkey] = match;
    return `https://bsky.app/profile/${did}/lists/${rkey}`;
  }
</script>

<div class="space-y-4">
  {#if loading && status === 'pending'}
    <div class="text-gray-600">Loading job status...</div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800 font-medium">Error</p>
      <p class="text-red-600">{error}</p>
    </div>
  {:else}
    <div class="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">Job Status</h3>
        <span class="px-3 py-1 rounded-full text-sm font-medium {getStatusColor(status)}">
          {status}
        </span>
      </div>

      {#if status === 'processing' || status === 'completed'}
        <div class="space-y-2">
          <div class="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{progress.current} / {progress.total} ({getProgressPercent()}%)</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div
              class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style="width: {getProgressPercent()}%"
            ></div>
          </div>
        </div>
      {/if}

      {#if status === 'completed' && destListUri}
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <p class="text-green-800 font-medium mb-2">Blocklist cloned successfully!</p>
          <a
            href={formatListUrl(destListUri)}
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:text-blue-800 underline"
          >
            View your new list on Bluesky
          </a>
        </div>
      {/if}

      {#if errors.length > 0}
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-yellow-800 font-medium mb-2">
            {errors.length} error{errors.length > 1 ? 's' : ''} occurred
          </p>
          <ul class="space-y-1 text-sm text-yellow-700">
            {#each errors as err}
              <li class="font-mono text-xs">
                {err.did}: {err.error}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if status === 'failed'}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800 font-medium">Job failed</p>
          <p class="text-red-600 text-sm">The cloning process encountered an error and could not complete.</p>
        </div>
      {/if}
    </div>
  {/if}
</div>
