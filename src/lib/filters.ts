import { AtpAgent } from '@atproto/api';
import { getUserFollows, getUserMutuals, fetchListMembers } from './atproto';
import type { JobFilters } from './kv';

export async function applyFilters(
  allDids: string[],
  filters: JobFilters,
  agent: AtpAgent
): Promise<string[]> {
  if (!agent.session) {
    throw new Error('Agent must be authenticated to apply filters');
  }

  const excludeSet = new Set<string>();

  if (filters.excludeFollows) {
    const follows = await getUserFollows(agent, agent.session.did);
    follows.forEach(did => excludeSet.add(did));
  }

  if (filters.excludeMutuals) {
    const mutuals = await getUserMutuals(agent, agent.session.did);
    mutuals.forEach(did => excludeSet.add(did));
  }

  if (filters.excludeListUris.length > 0) {
    for (const listUri of filters.excludeListUris) {
      const members = await fetchListMembers(agent, listUri);
      members.forEach(did => excludeSet.add(did));
    }
  }

  return allDids.filter(did => !excludeSet.has(did));
}
