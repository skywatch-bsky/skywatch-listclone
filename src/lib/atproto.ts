import { AtpAgent } from '@atproto/api';

export interface ParsedListUrl {
  handle: string;
  rkey: string;
}

export function parseListUrl(url: string): ParsedListUrl {
  const regex = /^https:\/\/bsky\.app\/profile\/([^\/]+)\/lists\/([^\/]+)$/;
  const match = url.match(regex);

  if (!match) {
    throw new Error('Invalid list URL format');
  }

  return {
    handle: match[1],
    rkey: match[2]
  };
}

export async function resolveHandle(agent: AtpAgent, handleOrDid: string): Promise<string> {
  if (handleOrDid.startsWith('did:')) {
    return handleOrDid;
  }

  const response = await agent.resolveHandle({ handle: handleOrDid });
  return response.data.did;
}

export async function fetchListMembers(agent: AtpAgent, listUri: string): Promise<string[]> {
  const members: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await agent.app.bsky.graph.getList({
      list: listUri,
      limit: 100,
      cursor
    });

    members.push(...response.data.items.map(item => item.subject.did));
    cursor = response.data.cursor;
  } while (cursor);

  return members;
}

export async function getUserFollows(agent: AtpAgent, did: string): Promise<string[]> {
  const follows: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await agent.app.bsky.graph.getFollows({
      actor: did,
      limit: 100,
      cursor
    });

    follows.push(...response.data.follows.map(follow => follow.did));
    cursor = response.data.cursor;
  } while (cursor);

  return follows;
}

export async function getUserMutuals(agent: AtpAgent, did: string): Promise<string[]> {
  const follows = await getUserFollows(agent, did);
  const followSet = new Set(follows);

  const mutuals: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await agent.app.bsky.graph.getFollowers({
      actor: did,
      limit: 100,
      cursor
    });

    const mutualFollowers = response.data.followers
      .map(follower => follower.did)
      .filter(followerDid => followSet.has(followerDid));

    mutuals.push(...mutualFollowers);
    cursor = response.data.cursor;
  } while (cursor);

  return mutuals;
}

export async function createList(
  agent: AtpAgent,
  name: string,
  description?: string,
  purpose: string = 'app.bsky.graph.defs#modlist'
): Promise<string> {
  if (!agent.session) {
    throw new Error('Agent must be authenticated to create lists');
  }

  const response = await agent.com.atproto.repo.createRecord({
    repo: agent.session.did,
    collection: 'app.bsky.graph.list',
    record: {
      $type: 'app.bsky.graph.list',
      purpose,
      name,
      description: description || '',
      createdAt: new Date().toISOString()
    }
  });

  return response.data.uri;
}

export async function addListMembers(
  agent: AtpAgent,
  listUri: string,
  memberDids: string[],
  batchSize: number = 25
): Promise<void> {
  if (!agent.session) {
    throw new Error('Agent must be authenticated to add list members');
  }

  if (memberDids.length === 0) {
    return;
  }

  for (let i = 0; i < memberDids.length; i += batchSize) {
    const batch = memberDids.slice(i, i + batchSize);

    for (const did of batch) {
      await agent.com.atproto.repo.createRecord({
        repo: agent.session.did,
        collection: 'app.bsky.graph.listitem',
        record: {
          $type: 'app.bsky.graph.listitem',
          subject: did,
          list: listUri,
          createdAt: new Date().toISOString()
        }
      });
    }
  }
}
