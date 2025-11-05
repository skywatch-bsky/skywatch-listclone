# Blocklist Cloner Design

## Overview

A Vercel-hosted web application that allows users to clone AT Protocol moderation lists to their own account with flexible filtering options. Users authenticate with Bluesky app passwords, provide a source list URL, configure filters (exclude follows/mutuals, exclude members from other lists), and receive a cloned list on their account.

**Goals:**
- Enable one-click cloning of moderation lists with user-defined filters
- Handle lists of any size through background job processing
- Provide transparent progress tracking without requiring re-authentication
- Support best-effort error handling for resilience

**Success Criteria:**
- Successfully clone lists with 1000+ members
- Complete clones within Vercel serverless limits (max 300s on Pro tier)
- Provide clear error reporting for partial failures
- Zero credential persistence after job creation

## Architecture

**Selected Approach:** Serverless + Vercel KV job queue

This architecture processes clones asynchronously using Vercel KV (Redis) for job state management. Jobs are created immediately and processed in the background, with frontend polling for status updates. This approach scales to any list size while remaining within Vercel's serverless constraints.

### Key Components

**Frontend (Svelte + Tailwind CSS):**
- `CloneForm.svelte` - Single form capturing credentials, source list URL, filters, and destination list name
- `JobStatus.svelte` - Real-time progress display via polling, shows completion state and error summary
- `JobLookup.svelte` - Optional component to check status of previous jobs via job ID

**API Layer (Vercel Serverless Functions):**
- `POST /api/clone` - Validates credentials, creates job, returns job ID
- `POST /api/jobs/[id]/process` - Internal background processor (self-invoked)
- `GET /api/jobs/[id]/status` - Public status endpoint (no auth required)

**State Management (Vercel KV):**
```typescript
interface Job {
  id: string // UUID v4
  status: 'pending' | 'processing' | 'completed' | 'failed'
  session: {
    did: string
    handle: string
    accessJwt: string
    refreshJwt: string
  }
  sourceListUri: string
  destListUri?: string
  destListName: string
  filters: {
    excludeFollows: boolean
    excludeMutuals: boolean
    excludeListUris: string[]
  }
  progress: { current: number, total: number }
  errors: Array<{ did: string, error: string }>
  createdAt: string
  completedAt?: string
}
```

**AT Protocol Integration (@atproto/api):**
- BskyAgent for authentication and API calls
- Session management with automatic JWT refresh
- Paginated list member fetching
- Batch list item creation (chunks of 25)

### Data Flow

**Clone Initiation:**
1. User submits form with credentials + clone configuration
2. Frontend validates input format (URL pattern, handle format, password format)
3. POST to `/api/clone` with all parameters
4. API creates BskyAgent, attempts `agent.login()`
5. On auth failure → return 401 with error message
6. On auth success → extract session tokens from `agent.session`
7. Parse Bluesky URL to AT-URI format (`at://did/app.bsky.graph.list/rkey`)
8. Create job in KV with UUID, store session tokens, set TTL of 7 days
9. Trigger `/api/jobs/[id]/process` asynchronously (no await)
10. Return job ID to frontend
11. Frontend redirects to `/status/[jobId]`

**Background Processing:**
1. Fetch job from KV by ID
2. Create BskyAgent with `resumeSession(job.session)`
3. Update job status to 'processing' in KV
4. Fetch source list members with pagination (handle cursors, accumulate all members)
5. If filters enabled: fetch user's follows and/or mutuals graph
6. For each exclude list URI: fetch members and build exclusion set (union of all DIDs)
7. Filter members: remove if DID matches follows/mutuals/exclude lists
8. Create destination list record (`app.bsky.graph.list`) with user-provided name
9. Deduplicate filtered members by DID
10. Batch-add members in chunks of 25 (`app.bsky.graph.listitem` records)
11. After each batch: atomically update KV with current progress
12. On completion: update job with 'completed' status, store `destListUri`
13. On error: update job with 'failed' status, store error details
14. Session auto-refreshes via `refreshJwt` if `accessJwt` expires

**Status Polling:**
1. Frontend polls `GET /api/jobs/[id]/status` every 2 seconds
2. Display progress bar (current/total members)
3. On 'completed': show success message with link to `https://bsky.app/profile/{handle}/lists/{rkey}`
4. On 'failed': show error message from job
5. On best-effort errors: show warning with expandable error list (DIDs + error messages)
6. If no status update for 10+ minutes while 'processing' → show "stalled" warning

## Existing Patterns

**No existing codebase patterns** - this is a fresh project with no prior code. Architectural decisions based on:
- Vercel platform best practices (serverless functions, KV for state)
- AT Protocol community patterns (from bluesky-social/cookbook examples)
- Standard Svelte application structure

**New patterns introduced:**
- Session token storage in KV for long-running jobs (required for token refresh during multi-hour clones)
- Public status endpoints with UUID job IDs (enables status checking without re-auth)
- Best-effort error collection (continues processing, reports failures at end)

## Implementation Phases

### Phase 1: Project Scaffolding
**Goal:** Set up development environment and tooling
**Components:**
- `package.json` with pnpm workspace configuration
- `tsconfig.json` with strict mode enabled
- Svelte + Vite configuration for Vercel deployment
- Tailwind CSS setup with base configuration
- `.env.example` with required environment variables
**Dependencies:** None
**Testing:** Verify `pnpm dev` starts dev server, TypeScript compiles without errors

### Phase 2: AT Protocol Utilities
**Goal:** Build core atproto integration layer
**Components:**
- `src/lib/atproto.ts` - exports `parseListUrl()`, `resolveHandle()`, `fetchListMembers()`, `getUserFollows()`, `getUserMutuals()`, `createList()`, `addListMembers()`
- Unit tests for URL parsing and DID resolution
**Dependencies:** Phase 1
**Testing:** Unit tests pass, can parse various Bluesky URL formats, handle resolution works

### Phase 3: Vercel KV Job Management
**Goal:** Implement job state management
**Components:**
- `src/lib/kv.ts` - exports `createJob()`, `updateJob()`, `getJob()`
- Job interface TypeScript definitions
- KV client initialization with connection pooling
**Dependencies:** Phase 1
**Testing:** Can create/read/update jobs in local KV instance, TTL expiration works

### Phase 4: Clone API Endpoint
**Goal:** Handle clone requests and job creation
**Components:**
- `src/routes/api/clone/+server.ts` - POST handler
- Credential validation logic
- Session extraction from BskyAgent
- Job creation and background trigger
**Dependencies:** Phases 2, 3
**Testing:** Can create jobs with valid credentials, rejects invalid auth, returns job ID

### Phase 5: Background Processing Function
**Goal:** Implement core clone logic
**Components:**
- `src/routes/api/jobs/[id]/process/+server.ts` - POST handler
- `src/lib/filters.ts` - member filtering logic (follows/mutuals/exclude lists)
- Batch processing with progress updates
- Error handling and retry logic
**Dependencies:** Phases 2, 3, 4
**Testing:** Successfully clones small test list, applies filters correctly, handles errors gracefully

### Phase 6: Status API and Frontend Polling
**Goal:** Enable real-time progress tracking
**Components:**
- `src/routes/api/jobs/[id]/status/+server.ts` - GET handler
- `src/lib/components/JobStatus.svelte` - polling component with progress display
- Error summary UI with expandable details
**Dependencies:** Phases 3, 5
**Testing:** Status updates appear in real-time, completion state renders correctly

### Phase 7: Clone Form UI
**Goal:** Build user-facing clone interface
**Components:**
- `src/lib/components/CloneForm.svelte` - form with validation
- `src/routes/+page.svelte` - landing page with form
- `src/routes/status/[id]/+page.svelte` - status page
- Input validation (URL format, password format, handle format)
**Dependencies:** Phases 4, 6
**Testing:** Form submission creates job, validation catches bad input, redirects to status page

### Phase 8: Deployment and Production Hardening
**Goal:** Deploy to Vercel and finalize production config
**Components:**
- `vercel.json` - deployment configuration
- Environment variable setup in Vercel dashboard (KV connection, secrets)
- Error monitoring setup (Vercel logs)
- Documentation: README with setup instructions, .env.example
**Dependencies:** All previous phases
**Testing:** Deploy to staging, test full flow end-to-end, verify error handling in production

## Additional Considerations

### Error Handling

**Network & API Errors:**
- List member fetch failures → retry up to 3 times with exponential backoff (1s, 2s, 4s)
- Rate limits from AT Protocol → respect `Retry-After` header, pause processing
- Individual listitem creation failures → log to `job.errors[]`, continue processing (best-effort)
- Session refresh failure → fail job with "Session expired" message

**Validation Errors:**
- Invalid list URL format → return 400 before creating job
- List not found (404) → return 404 with "List not found" message
- Private/blocked list (403) → return 403 with "Cannot access list" message
- Invalid credentials → return 401 during initial login

**Edge Cases:**
- Empty source list → complete successfully with 0 members
- All members filtered out → create empty list, show warning
- Source list changes during clone → ignore (snapshot at job start)
- Duplicate members → deduplicate by DID before adding
- Job crashes → status remains "processing", frontend shows "stalled" after 10min

### Security

- Session tokens stored in KV with 7-day TTL (auto-cleanup)
- Job IDs are UUIDv4 (unguessable, safe for public status endpoint)
- No credential persistence beyond job lifetime
- `refreshJwt` less sensitive than app password but still protected via KV access controls

### Future Extensibility

- **OAuth Migration:** Replace `agent.login()` with OAuth flow, store OAuth tokens in job.session instead
- **Scheduled Syncing:** Add cron job to re-clone lists periodically (requires storing source list URI + filters)
- **List Diff View:** Show additions/removals between source and cloned list before confirming
- **Webhook Notifications:** POST to user-provided URL when job completes (instead of polling)
