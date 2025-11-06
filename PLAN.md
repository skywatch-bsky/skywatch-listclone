# Phase 5: Background Processing Function

## Implementation Plan

### Step 1: Filter Utilities (TDD)
**File:** `src/lib/filters.ts`

**Tests First:** `src/lib/filters.test.ts`
1. Test `applyFilters` with no filters (returns all DIDs)
2. Test `applyFilters` with excludeFollows
3. Test `applyFilters` with excludeMutuals
4. Test `applyFilters` with excludeListUris (single list)
5. Test `applyFilters` with multiple exclusion lists
6. Test `applyFilters` with all filters combined

**Implementation:**
- `applyFilters(allDids: string[], filters: JobFilters, agent: AtpAgent): Promise<string[]>`
- Use existing utilities: getUserFollows, getUserMutuals, fetchListMembers
- Build exclusion set from all filter sources
- Return filtered array

### Step 2: Process Endpoint (TDD)
**File:** `src/routes/api/jobs/[id]/process/+server.ts`

**Tests First:** `src/routes/api/jobs/[id]/process/server.test.ts`
1. Test 404 when job doesn't exist
2. Test basic job processing (no filters)
3. Test job processing with filters
4. Test progress tracking updates
5. Test error handling (individual member failures)
6. Test critical error handling (auth failure, list creation failure)
7. Test destination list URI is stored
8. Test completedAt timestamp is set

**Implementation:**
1. Extract jobId from params
2. Load job from KV
3. Return 404 if not found
4. Update status to 'processing'
5. Create AtpAgent and restore session
6. Fetch source list members
7. Update progress.total
8. Apply filters
9. Create destination list
10. Store destListUri
11. Add members in batches
12. Update progress.current after each batch
13. Track errors in job.errors
14. Update status to 'completed' or 'failed'
15. Set completedAt
16. Return result JSON

### Step 3: Verification
- All tests pass
- Manual verification if possible
- Commit with descriptive message

## Key Design Decisions

1. **Best-effort processing:** Individual member failures don't fail the entire job
2. **Session restoration:** Use `agent.session = job.session` to restore auth
3. **Progress tracking:** Update after each batch for granular progress
4. **Error tracking:** Store individual errors in job.errors array
5. **Critical vs non-critical errors:**
   - Critical: auth failure, list creation failure → status='failed'
   - Non-critical: individual member add failures → continue processing

## Dependencies
- AtpAgent from @atproto/api
- Existing utilities from src/lib/atproto.ts
- Existing job management from src/lib/kv.ts
