# Case Triage Assistant

A focused Next.js (App Router) demo that analyzes case notes and returns a structured triage result for admin users.

## Setup / Run

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000`

Optional tests:

- `npm run test`

### API Usage Notes

The admin API requires explicit headers:

- `x-admin: true`
- `x-permission: triage:write`

Example:

```bash
curl -X POST "http://localhost:3000/api/admin/case-triage/ad-hoc/analyze" \
	-H "Content-Type: application/json" \
	-H "x-admin: true" \
	-H "x-permission: triage:write" \
	-d '{"noteText":"PASTE_NOTE_TEXT_HERE"}'
```

## What I Implemented

- Admin API route: `POST /api/admin/case-triage/[id]/analyze`
- Strict request/response validation with schema-first rules
- AI analysis mock that returns structured JSON
- In-memory persistence for results and errors
- Admin UI with loading, error, and success states

## Design Summary

- **Data flow**: UI -> API -> AI service -> validation -> persistence -> UI
- **Trust boundaries**: validate input before AI, validate output before persistence/UI
- **Failure handling**: invalid AI output returns `422`, provider errors return `500`

## Known Limitations

- Auth uses header-based checks for the demo; replace with real session permissions.
- `caseId` lookup is not implemented (requires `noteText` for now).
- AI integration is a deterministic mock, not a real provider.
- Persistence is in-memory and resets on server restart.

## Next Improvements

- Replace the auth stub with real permission checks.
- Fetch note content from the database by `caseId`.
- Integrate a real AI provider with schema-first JSON output.
- Add telemetry, retries, and durable persistence.
