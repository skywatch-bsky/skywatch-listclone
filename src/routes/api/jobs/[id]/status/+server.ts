import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getJob } from '$lib/kv';

export const GET: RequestHandler = async ({ params }) => {
  const job = await getJob(params.id);

  if (!job) {
    return json({ error: 'Job not found' }, { status: 404 });
  }

  const sanitizedResponse = {
    id: job.id,
    status: job.status,
    progress: job.progress,
    errors: job.errors,
    createdAt: job.createdAt,
    ...(job.destListUri && { destListUri: job.destListUri }),
    ...(job.completedAt && { completedAt: job.completedAt })
  };

  return json(sanitizedResponse);
};
