# Graduate Developer Interview Challenge

## Title

Case Triage Assistant (Structured AI + System Design)

## Context

You are working in a healthcare admin platform built with Next.js (App Router), TypeScript, API route handlers, and a relational database layer.
The platform has strong auth and permission requirements, and already includes AI-powered analysis features.

Your task is to design and implement a small feature that fits this architecture.

## Challenge Brief

Design and build a "Case Triage Assistant" feature for admin users.

Given a case note (free text), the system should:

1. Generate a short summary.
2. Assign a priority level (Low, Medium, High, Critical).
3. Suggest 3-6 structured tags (for example: "documentation_missing", "urgent_follow_up").
4. Return a confidence score (0-100).

The key goal is not only coding, but showing thoughtful system structure and disciplined AI usage.

## What We Want To Assess

- How you structure a feature end-to-end (UI -> API -> AI service -> persistence).
- How you enforce trust boundaries (auth, permissions, input validation, output validation).
- How you design reliable AI interactions (structured output schema, deterministic handling, fallbacks).
- How you communicate trade-offs and justify your decisions.

## Timebox

90 to 120 minutes.

## Expected Deliverables

1. Design Notes (short, but clear)
   - API contract.
   - Data flow.
   - Error and fallback strategy.
   - Security assumptions.

2. Working Implementation
   - One admin API route for triage analysis.
   - One small UI panel/button to trigger analysis and display results.
   - Structured AI response handling and validation.
   - Basic persistence of results (table or temporary store is acceptable if clearly documented).

3. Short README Section
   - What you implemented.
   - What you intentionally did not implement due to time.
   - What you would improve next.

## Technical Requirements

1. Auth and permissions
   - Assume this route is admin-only.
   - Include an explicit permission check (for example, read/write separation).

2. API contract
   - Request includes caseId (or note text if no DB read is available).
   - Response includes:
     - summary: string
     - priority: "Low" | "Medium" | "High" | "Critical"
     - tags: string[]
     - confidence: number
     - modelUsed: string (or equivalent metadata)

3. AI design
   - Use structured JSON output (schema-first approach).
   - Validate AI output before persistence or UI display.
   - Handle failure safely (invalid output, timeout, provider errors).

4. UX expectations
   - Loading state.
   - Error state with human-readable message.
   - Successful state showing all structured fields.

5. Code quality
   - Keep modules focused (avoid one giant file).
   - Add concise comments only where logic is non-obvious.
   - Follow existing project patterns where possible.

## Constraints

- Do not over-engineer.
- Keep the solution production-minded but pragmatic for a timeboxed interview.
- Make assumptions explicitly when required information is missing.

## Suggested Implementation Shape

You may use this flow:

1. UI action triggers POST /api/admin/case-triage/[id]/analyze
2. Route authenticates user and checks permission
3. Route fetches note content (or accepts note in request)
4. Route calls AI service with strict schema
5. Route validates response
6. Route persists and returns structured result
7. UI renders result and handles failures cleanly

## Evaluation Rubric (Guide)

1. Architecture and structure (30%)
   - Clear boundaries and responsibilities.

2. Reliability and safety (25%)
   - Input/output validation, error handling, predictable behavior.

3. AI integration quality (20%)
   - Structured outputs, sensible prompting strategy, schema discipline.

4. Product thinking and UX (15%)
   - Useful states and user feedback.

5. Communication (10%)
   - Clear explanation of choices and trade-offs.

## Bonus (Optional)

- Add prompt versioning metadata.
- Add retry policy with safe limits.
- Add minimal telemetry/logging for failures.

## Submission Format

Please submit:

1. Code changes.
2. A short markdown note with:
   - Setup/run steps.
   - Design summary.
   - Known limitations.
   - Next improvements.

## Interviewer Notes (Internal)

Strong candidates usually:

- Create clear boundaries between route/controller, AI service, and validation logic.
- Treat AI output as untrusted input and validate it.
- Handle unhappy paths early.
- Explain why they made a simpler choice under time pressure.
