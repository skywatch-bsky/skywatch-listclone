import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AtpAgent } from '@atproto/api';
import { parseListUrl, resolveHandle } from '$lib/atproto';
import { createJob } from '$lib/kv';
import type { JobFilters } from '$lib/kv';

interface CloneRequest {
  sourceListUrl: string;
  destListName: string;
  handle: string;
  password: string;
  filters: JobFilters;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json() as Partial<CloneRequest>;

    if (!body.sourceListUrl) {
      return json({ error: 'Missing required field: sourceListUrl' }, { status: 400 });
    }

    if (!body.destListName) {
      return json({ error: 'Missing required field: destListName' }, { status: 400 });
    }

    if (!body.handle) {
      return json({ error: 'Missing required field: handle' }, { status: 400 });
    }

    if (!body.password) {
      return json({ error: 'Missing required field: password' }, { status: 400 });
    }

    if (!body.filters) {
      return json({ error: 'Missing required field: filters' }, { status: 400 });
    }

    let parsed;
    try {
      parsed = parseListUrl(body.sourceListUrl);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Invalid list URL' }, { status: 400 });
    }

    const agent = new AtpAgent({ service: 'https://bsky.social' });

    try {
      await agent.login({
        identifier: body.handle,
        password: body.password
      });
    } catch (error) {
      return json({ error: 'Authentication failed' }, { status: 401 });
    }

    if (!agent.session) {
      return json({ error: 'Authentication failed' }, { status: 401 });
    }

    const listOwnerDid = await resolveHandle(agent, parsed.handle);
    const sourceListUri = `at://${listOwnerDid}/app.bsky.graph.list/${parsed.rkey}`;

    const job = await createJob({
      session: {
        did: agent.session.did,
        handle: agent.session.handle,
        accessJwt: agent.session.accessJwt,
        refreshJwt: agent.session.refreshJwt
      },
      sourceListUri,
      destListName: body.destListName,
      filters: body.filters
    });

    // trigger processing in background (fire and forget)
    const url = new URL(request.url);
    const processUrl = `${url.origin}/api/jobs/${job.id}/process`;
    fetch(processUrl, { method: 'POST' }).catch(err =>
      console.error('Failed to trigger processing:', err)
    );

    return json({ jobId: job.id });
  } catch (error) {
    console.error('Clone API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
