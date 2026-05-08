# Case Triage Assistant Plan

This plan outlines a focused implementation for the Case Triage Assistant using Next.js App Router and TypeScript. It assumes a greenfield workspace and keeps scope production-minded but minimal.

## Goals

- Provide a single admin-only API route that analyzes a case note.
- Use structured AI output with strict validation before persistence or display.
- Persist results in a minimal, documented store.
- Provide a small admin UI to trigger analysis and display results.

## API Contract

**Request**

- `caseId`: string (optional)
- `noteText`: string (optional, required if `caseId` is not provided)

**Response**

- `summary`: string
- `priority`: "Low" | "Medium" | "High" | "Critical"
- `tags`: string[]
- `confidence`: number (0-100)
- `modelUsed`: string

**Errors**

- 401/403: not authenticated or lacking permission
- 400: invalid input (missing note, invalid lengths)
- 422: invalid AI output (schema mismatch)
- 500: provider errors or persistence failures

## Design Notes (Deliverable)

This document will be submitted with the final code changes and includes:

- API contract (request/response and error codes)
- Data flow (UI -> API -> AI -> validation -> persistence -> UI)
- Error and fallback strategy
- Security assumptions and permission model

## Trust Boundaries

- Validate input before any DB or AI call.
- Validate AI output strictly against a schema.
- Only persist and return validated results.
- Enforce admin-only access with an explicit permission check.

## Validation Rules

- Input length: reject `noteText` outside 1,000-5,000 characters.
- Priority must be one of: Low, Medium, High, Critical.
- Tags must be 3-6 items, lowercase, and snake_case.
- Confidence must be between 0 and 100.
- Summary must be non-empty and under 500 characters.

## Response Metadata

Include the following metadata in responses and persistence:

- `modelUsed`
- `promptVersion`
- `durationMs`
- `requestId`

## Data Flow

1. UI triggers POST `/api/admin/case-triage/[id]/analyze`.
2. API authenticates the user and checks admin permission.
3. API fetches note text (from DB via `caseId`) or uses `noteText`.
4. API calls AI service with schema-first prompt.
5. API validates AI response; rejects invalid output.
6. API persists result and returns it to the UI.
7. UI renders success, loading, or error state.

## Error & Fallback Strategy

- Fail fast on invalid input.
- If AI output is invalid, return a safe error and do not persist.
- If the AI provider fails or times out, return a recoverable error message.
- Do not attempt best-effort parsing of invalid AI output.

## UX Expectations

- Loading state while the analysis runs.
- Clear error state with a human-readable message.
- Success state displaying all structured fields.

## Persistence (Minimal)

Store fields:

- `caseId` (nullable if note is direct input)
- `summary`, `priority`, `tags`, `confidence`
- `modelUsed`
- `createdAt`
- `status` (success or error)

## Implementation Steps

Mark each item with a check as it is completed.

- [ ] Define request/response schemas and shared types.
- [ ] Build the admin API route with auth, permission check, and validation.
- [ ] Create the AI service with strict JSON output and fallback handling.
- [ ] Add minimal persistence layer.
- [ ] Build the admin UI panel with loading/error/success states.
- [ ] Document assumptions, limitations, and next steps.

## Minimal Tests

- Schema validation rejects invalid priority, tag count, and confidence values.
- API returns 401/403 for unauthorized users.
- API returns 400 for invalid input and 422 for invalid AI output.
- UI renders loading, error, and success states correctly.

## Trade-offs (Timeboxed)

- No historical analytics dashboard.
- No advanced retry policy beyond a single safe attempt.
- Minimal audit logging and telemetry.

## Assumptions

- If no case table exists, the API accepts `noteText` directly.
- Admin permission is available via existing auth middleware or utility.
- A relational store or a temporary store is acceptable for MVP.

## Out of Scope (Timeboxed)

- Comprehensive telemetry and tracing.
- Historical analytics or triage dashboards.
- Advanced retry policy beyond a single safe attempt.

## Next Improvements

- Retry with safe backoff and per-request timeouts.
- Prompt versioning and A/B comparison.
- Stronger auditing and access logs.
