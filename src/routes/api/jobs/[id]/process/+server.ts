import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AtpAgent } from '@atproto/api';
import { getJob, updateJob } from '$lib/kv';
import { fetchListMembers, createList, addListMembers } from '$lib/atproto';
import { applyFilters } from '$lib/filters';

export const POST: RequestHandler = async ({ params }) => {
  const jobId = params.id;

  try {
    const job = await getJob(jobId);
    if (!job) {
      return json({ error: 'Job not found' }, { status: 404 });
    }

    await updateJob(jobId, { status: 'processing' });

    const agent = new AtpAgent({ service: 'https://bsky.social' });
    Object.defineProperty(agent, 'session', {
      value: job.session,
      writable: false,
      configurable: true
    });

    const sourceMembers = await fetchListMembers(agent, job.sourceListUri);

    await updateJob(jobId, {
      progress: { current: 0, total: sourceMembers.length }
    });

    const filteredMembers = await applyFilters(sourceMembers, job.filters, agent);

    let destListUri: string;
    try {
      destListUri = await createList(agent, job.destListName);
      await updateJob(jobId, { destListUri });
    } catch (error) {
      await updateJob(jobId, {
        status: 'failed',
        completedAt: new Date().toISOString()
      });
      return json({
        status: 'failed',
        progress: job.progress
      });
    }

    const result = await addListMembers(agent, destListUri, filteredMembers, 25);

    if (result.errors.length > 0) {
      await updateJob(jobId, { errors: result.errors });
    }

    await updateJob(jobId, {
      status: 'completed',
      progress: { current: result.successful, total: sourceMembers.length },
      completedAt: new Date().toISOString()
    });

    return json({
      status: 'completed',
      progress: { current: result.successful, total: sourceMembers.length }
    });

  } catch (error) {
    await updateJob(jobId, {
      status: 'failed',
      completedAt: new Date().toISOString()
    });

    return json({
      status: 'failed',
      progress: { current: 0, total: 0 }
    });
  }
};
