import { BskyAgent } from '@atproto/api';

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

export async function resolveHandle(agent: BskyAgent, handleOrDid: string): Promise<string> {
  if (handleOrDid.startsWith('did:')) {
    return handleOrDid;
  }

  const response = await agent.resolveHandle({ handle: handleOrDid });
  return response.data.did;
}

export async function fetchListMembers(agent: BskyAgent, listUri: string): Promise<string[]> {
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
