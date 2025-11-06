<script lang="ts">
  import CloneForm from '$lib/components/CloneForm.svelte';
  import JobStatus from '$lib/components/JobStatus.svelte';

  let jobId: string | undefined;

  function handleSuccess(event: CustomEvent<{ jobId: string }>) {
    jobId = event.detail.jobId;
  }
</script>

<div class="min-h-screen bg-gray-50 py-12 px-4">
  <div class="max-w-4xl mx-auto">
    <header class="text-center mb-12">
      <h1 class="text-4xl font-bold text-blue-600 mb-2">Bluesky Blocklist Cloner</h1>
      <p class="text-gray-600">Clone moderation lists with advanced filtering</p>
    </header>

    {#if jobId}
      <div class="space-y-6">
        <JobStatus {jobId} />
        <button
          on:click={() => jobId = undefined}
          class="w-full max-w-2xl mx-auto block bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Clone Another List
        </button>
      </div>
    {:else}
      <CloneForm on:success={handleSuccess} />
    {/if}
  </div>
</div>
