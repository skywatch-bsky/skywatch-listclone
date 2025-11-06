<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ success: { jobId: string } }>();

  let sourceListUrl = '';
  let destListName = '';
  let handle = '';
  let password = '';
  let excludeFollows = false;
  let excludeMutuals = false;
  let excludeListUris = '';

  let loading = false;
  let error: string | undefined;
  let fieldErrors: Record<string, string> = {};

  function validateListUrl(url: string): boolean {
    const pattern = /^https:\/\/bsky\.app\/profile\/[^/]+\/lists\/[a-z0-9]+$/i;
    return pattern.test(url);
  }

  function validateForm(): boolean {
    fieldErrors = {};

    if (!sourceListUrl.trim()) {
      fieldErrors.sourceListUrl = 'Source list URL is required';
    } else if (!validateListUrl(sourceListUrl)) {
      fieldErrors.sourceListUrl = 'Invalid list URL format';
    }

    if (!destListName.trim()) {
      fieldErrors.destListName = 'List name is required';
    }

    if (!handle.trim()) {
      fieldErrors.handle = 'Handle is required';
    }

    if (!password.trim()) {
      fieldErrors.password = 'App password is required';
    }

    return Object.keys(fieldErrors).length === 0;
  }

  function parseExcludeListUris(text: string): string[] {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  async function handleSubmit() {
    error = undefined;

    if (!validateForm()) {
      return;
    }

    loading = true;

    try {
      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceListUrl,
          destListName,
          handle,
          password,
          filters: {
            excludeFollows,
            excludeMutuals,
            excludeListUris: parseExcludeListUris(excludeListUris)
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.error || 'Failed to create clone job';
        loading = false;
        return;
      }

      dispatch('success', { jobId: data.jobId });

      sourceListUrl = '';
      destListName = '';
      handle = '';
      password = '';
      excludeFollows = false;
      excludeMutuals = false;
      excludeListUris = '';
      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      loading = false;
    }
  }

  function getFieldClass(fieldName: string): string {
    const baseClass = 'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';
    return fieldErrors[fieldName]
      ? `${baseClass} border-red-500`
      : `${baseClass} border-gray-300`;
  }
</script>

<div class="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl mx-auto">
  <h2 class="text-2xl font-bold text-gray-900 mb-6">Clone a Moderation List</h2>

  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <label for="sourceListUrl" class="block text-sm font-medium text-gray-700 mb-1">
        Source List URL
      </label>
      <input
        id="sourceListUrl"
        type="text"
        bind:value={sourceListUrl}
        placeholder="https://bsky.app/profile/handle/lists/abc123"
        class={getFieldClass('sourceListUrl')}
        disabled={loading}
      />
      {#if fieldErrors.sourceListUrl}
        <p class="mt-1 text-sm text-red-600">{fieldErrors.sourceListUrl}</p>
      {/if}
    </div>

    <div>
      <label for="destListName" class="block text-sm font-medium text-gray-700 mb-1">
        New List Name
      </label>
      <input
        id="destListName"
        type="text"
        bind:value={destListName}
        placeholder="My Cloned List"
        class={getFieldClass('destListName')}
        disabled={loading}
      />
      {#if fieldErrors.destListName}
        <p class="mt-1 text-sm text-red-600">{fieldErrors.destListName}</p>
      {/if}
    </div>

    <div>
      <label for="handle" class="block text-sm font-medium text-gray-700 mb-1">
        Your Bluesky Handle
      </label>
      <input
        id="handle"
        type="text"
        bind:value={handle}
        placeholder="yourhandle.bsky.social"
        class={getFieldClass('handle')}
        disabled={loading}
      />
      {#if fieldErrors.handle}
        <p class="mt-1 text-sm text-red-600">{fieldErrors.handle}</p>
      {/if}
    </div>

    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
        App Password
      </label>
      <input
        id="password"
        type="password"
        bind:value={password}
        placeholder="••••••••••••"
        class={getFieldClass('password')}
        disabled={loading}
      />
      <p class="mt-1 text-sm text-gray-500">
        Generate at <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">bsky.app/settings/app-passwords</a>
      </p>
      {#if fieldErrors.password}
        <p class="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
      {/if}
    </div>

    <div class="border-t border-gray-200 pt-4">
      <h3 class="text-lg font-medium text-gray-900 mb-3">Filters</h3>

      <div class="space-y-2">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={excludeFollows}
            disabled={loading}
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span class="text-sm text-gray-700">Exclude accounts I follow</span>
        </label>

        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={excludeMutuals}
            disabled={loading}
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span class="text-sm text-gray-700">Exclude mutual follows</span>
        </label>
      </div>

      <div class="mt-4">
        <label for="excludeListUris" class="block text-sm font-medium text-gray-700 mb-1">
          Exclude members from these lists (one URL per line)
        </label>
        <textarea
          id="excludeListUris"
          bind:value={excludeListUris}
          placeholder="https://bsky.app/profile/..."
          rows="3"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
          disabled={loading}
        ></textarea>
      </div>
    </div>

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800 font-medium">Error</p>
        <p class="text-red-600 text-sm">{error}</p>
      </div>
    {/if}

    <button
      type="submit"
      disabled={loading}
      class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
    >
      {#if loading}
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Creating clone job...</span>
      {:else}
        <span>Clone List</span>
      {/if}
    </button>
  </form>
</div>
