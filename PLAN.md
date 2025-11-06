# Phase 7: Clone Form UI

## Implementation Plan

### Component 1: CloneForm.svelte
**File:** `src/lib/components/CloneForm.svelte`

**Form Fields:**
1. `sourceListUrl` - text input (required)
   - Validates Bluesky list URL pattern
2. `destListName` - text input (required)
3. `handle` - text input (required)
4. `password` - password input (required)
   - Hidden, with help text for app password generation
5. `excludeFollows` - checkbox
6. `excludeMutuals` - checkbox
7. `excludeListUris` - textarea (optional)
   - Parse newline-separated URLs

**Behavior:**
1. Form validation (all required fields)
2. On submit:
   - Show loading state
   - POST to `/api/clone` with structured data
   - On success: emit `success` event with `{ jobId }`
   - On error: display inline error message
3. Disable submit button while loading
4. Clear form on success

**API Integration:**
```typescript
POST /api/clone
{
  sourceListUrl: string,
  destListName: string,
  handle: string,
  password: string,
  filters: {
    excludeFollows: boolean,
    excludeMutuals: boolean,
    excludeListUris: string[]
  }
}
```

### Component 2: Main Page
**File:** `src/routes/+page.svelte`

**Layout:**
1. Header with title and description
2. CloneForm component
3. JobStatus component (conditional on jobId)

**Flow:**
1. User fills form → submits
2. On success, store jobId in component state
3. Show JobStatus component
4. JobStatus polls for updates

**Styling:**
- Tailwind CSS (already configured)
- Responsive design
- Form validation states (red borders, error text)
- Loading spinners

### Implementation Steps

1. **Create CloneForm.svelte**
   - Build form structure with all fields
   - Add validation logic
   - Implement submit handler with API call
   - Add loading/error states
   - Emit success event

2. **Update +page.svelte**
   - Import CloneForm and JobStatus
   - Add jobId state management
   - Add header section
   - Conditional rendering based on jobId
   - Handle success event

3. **Manual Testing**
   - Run dev server
   - Test form validation (empty fields)
   - Test invalid URL format
   - Test API integration with valid credentials
   - Verify JobStatus appears after submission
   - Verify progress polling works

4. **Type Checking**
   - Run `pnpm run check` to verify compilation

## Key Design Decisions

1. **No automated component tests:** Manual testing is sufficient for UI components
2. **Inline validation:** Show errors directly on form fields for better UX
3. **Loading states:** Disable form and show spinner during submission
4. **Event-driven:** CloneForm emits events rather than managing jobId directly
5. **URL parsing:** Handle textarea input by splitting on newlines and trimming
6. **Clear on success:** Optional form clearing after successful submission
