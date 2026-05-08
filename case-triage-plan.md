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

## Trust Boundaries

- Validate input before any DB or AI call.
- Validate AI output strictly against a schema.
- Only persist and return validated results.
- Enforce admin-only access with an explicit permission check.

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

## Persistence (Minimal)

Store fields:

- `caseId` (nullable if note is direct input)
- `summary`, `priority`, `tags`, `confidence`
- `modelUsed`
- `createdAt`
- `status` (success or error)

## Implementation Steps

1. Define request/response schemas and shared types.
2. Build the admin API route with auth, permission check, and validation.
3. Create the AI service with strict JSON output and fallback handling.
4. Add minimal persistence layer.
5. Build the admin UI panel with loading/error/success states.
6. Document assumptions, limitations, and next steps.

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
