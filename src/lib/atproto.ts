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
