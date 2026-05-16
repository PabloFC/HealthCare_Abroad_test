# 📊 Data Flow of the Case Triage Assistant Project

This document explains in detail how the data flow works: **UI → API → AI → Validation → Persistence → UI**

---

## 🎯 General Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                        COMPLETE DATA CYCLE                              │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   1. UI      │  User writes case note
    │  (React)     │  and submits
    └──────┬───────┘
           │
           │ POST /api/admin/case-triage/[id]/analyze
           │ { noteText, caseId }
           │
           ▼
    ┌──────────────────────────┐
    │  2. API ENDPOINT         │  ✓ Validate permissions
    │  (route.ts)              │  ✓ Parse JSON
    │                          │  ✓ Validate input
    └──────┬───────────────────┘
           │
           │ validated noteText
           │
           ▼
    ┌──────────────────────────┐
    │  3. AI SERVICE           │  ✓ Build prompt
    │  (service.ts)            │  ✓ Call model
    │                          │  ✓ Parse JSON response
    └──────┬───────────────────┘
           │
           │ Raw JSON from model
           │ { summary, priority, tags, confidence }
           │
           ▼
    ┌──────────────────────────┐
    │  4. VALIDATION           │  ✓ Validate schema
    │  (validators.ts)         │  ✓ Apply business rules
    │                          │  ✓ Return TriageResult
    └──────┬───────────────────┘
           │
           │ Validated data
           │
           ▼
    ┌──────────────────────────┐
    │  5. PERSISTENCE          │  ✓ Save to memory
    │  (triageStore.ts)        │  ✓ Record metadata
    │                          │  ✓ Store history
    └──────┬───────────────────┘
           │
           │ Response JSON
           │
           ▼
    ┌──────────────────────────┐
    │  6. UI DISPLAY           │  ✓ Show result
    │  (ResultPanel.tsx)       │  ✓ Update state
    │                          │  ✓ Render safely
    └──────────────────────────┘
```

---

## 1️⃣ STEP 1: UI - User Sends Data

### 📍 Location: `src/app/page.tsx` and `src/hooks/useTriageAnalysis.ts`

The user completes the form. State is managed in React:

```typescript
// src/app/page.tsx
const [noteText, setNoteText] = useState("");
const [caseId, setCaseId] = useState("");

// Validation on CLIENT (first line of defense)
const noteLength = noteText.trim().length;
const canSubmit =
  noteLength >= NOTE_MIN_LENGTH && noteLength <= NOTE_MAX_LENGTH;

// Hook that manages the entire flow
const { result, error, meta, isSubmitting, submit } = useTriageAnalysis({
  noteText,
  caseId,
  adminMode: true,
  canSubmit,
});
```

### The Hook Makes the Fetch

```typescript
// src/hooks/useTriageAnalysis.ts - lines 38-60

const submit = useCallback(async () => {
  if (!canSubmit || isSubmitting) return;

  setIsSubmitting(true);
  setError(null);
  setResult(null);

  const payload: { noteText: string; caseId?: string } = {
    noteText: noteText.trim(),
  };

  if (caseId.trim()) {
    payload.caseId = caseId.trim();
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-admin": "true", // ← Credential 1
      "x-permission": "triage:write", // ← Credential 2
    };

    const response = await fetch(
      `/api/admin/case-triage/${encodeURIComponent(requestCaseId)}/analyze`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();

    if (!response.ok && "error" in data) {
      setError(data.error);
      return;
    }

    setResult(data); // ✅ Result ready to render
  } catch (submitError) {
    setError(
      submitError instanceof Error ? submitError.message : "Request failed.",
    );
  } finally {
    setIsSubmitting(false);
  }
}, [adminMode, canSubmit, caseId, isSubmitting, noteText]);
```

---

## 2️⃣ STEP 2: API - Validate Input and Permissions

### 📍 Location: `src/app/api/admin/case-triage/[id]/analyze/route.ts`

The server receives the request and applies multiple validation layers:

```typescript
// route.ts - Lines 8-30

export async function POST(request: Request) {
  // ═══════════════════════════════════════════════════════════════
  // LAYER 1: Validate PERMISSIONS (auth headers)
  // ═══════════════════════════════════════════════════════════════
  const permission = requireAdminPermission(request);

  if (!permission.ok) {
    return NextResponse.json(
      { error: permission.message },
      { status: permission.status }, // 401 or 403
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER 2: Parse JSON
  // ═══════════════════════════════════════════════════════════════
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER 3: Validate INPUT SCHEMA
  // ═══════════════════════════════════════════════════════════════
  const validation = validateTriageRequest(body);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { noteText, caseId } = validation.value;

  if (!noteText) {
    return NextResponse.json(
      { error: "noteText is required." },
      { status: 400 },
    );
  }

  // ✅ If we get here, the input is valid and safe
  // Proceed to next step: AI
  const analysis = await analyzeCaseNote(noteText);
  // ...
}
```

### Detailed Input Validation

```typescript
// src/lib/triageSchemas.ts - input validation

export const NOTE_MIN_LENGTH = 1000;
export const NOTE_MAX_LENGTH = 5000;

export function validateTriageRequest(
  input: unknown,
): ValidationResult<TriageRequest> {
  // Step 1: Is it an object?
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const record = input as Record<string, unknown>;

  // Step 2: Extract and trim values
  const caseId =
    typeof record.caseId === "string" ? record.caseId.trim() : undefined;
  const noteText =
    typeof record.noteText === "string" ? record.noteText.trim() : undefined;

  // Step 3: Is there at least something?
  if (!caseId && !noteText) {
    return { ok: false, error: "Provide caseId or noteText." };
  }

  // Step 4: Does the note have the correct size?
  if (noteText) {
    if (
      noteText.length < NOTE_MIN_LENGTH ||
      noteText.length > NOTE_MAX_LENGTH
    ) {
      return {
        ok: false,
        error: `noteText must be between ${NOTE_MIN_LENGTH} and ${NOTE_MAX_LENGTH} characters.`,
      };
    }
  }

  // ✅ Everything validated
  return { ok: true, value: { caseId, noteText } };
}
```

---

## 3️⃣ STEP 3: AI Service - Process with AI

### 📍 Location: `src/lib/triage/service.ts`

Once the input is validated, it is sent for processing:

```typescript
// src/lib/triage/service.ts

export async function analyzeCaseNote(
  noteText: string,
): Promise<TriageAnalysisSuccess | TriageAnalysisFailure> {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Build the prompt
    // ═══════════════════════════════════════════════════════════════
    buildPrompt(noteText);

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Call the model (in this case it's a simulated mock)
    // ═══════════════════════════════════════════════════════════════
    const responseText = simulateModelResponse(noteText, {
      requestId,
      promptVersion: PROMPT_VERSION,
      durationMs: 0,
      modelUsed: MODEL_USED,
    });

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Parse the response as JSON
    // ═══════════════════════════════════════════════════════════════
    const parsed = JSON.parse(responseText) as Record<string, unknown>;
    const durationMs = Date.now() - startedAt;
    parsed.durationMs = durationMs;

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Validate the model output (see step 4 below)
    // ═══════════════════════════════════════════════════════════════
    const validation = validateTriageResult(parsed);

    if (!validation.ok) {
      // The AI returned something that doesn't comply with our schema
      return {
        ok: false,
        error: validation.error,
        kind: "invalid_output", // ← Specific error
        requestId,
        modelUsed: MODEL_USED,
        promptVersion: PROMPT_VERSION,
        durationMs,
      };
    }

    // ✅ Success: AI output is valid
    return { ok: true, value: validation.value };
  } catch (error) {
    // Error from AI provider
    const durationMs = Date.now() - startedAt;
    return {
      ok: false,
      error: error instanceof Error ? error.message : "AI provider error.",
      kind: "provider_error", // ← Different error
      requestId,
      modelUsed: MODEL_USED,
      promptVersion: PROMPT_VERSION,
      durationMs,
    };
  }
}
```

### Example Model Response

```json
{
  "summary": "Patient with symptoms of severe inflammation in joints. Requires urgent specialized evaluation.",
  "priority": "High",
  "tags": ["arthritis", "inflammatory", "urgent"],
  "confidence": 0.92,
  "modelUsed": "gpt-4-mock",
  "promptVersion": "v1.0",
  "durationMs": 245,
  "requestId": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6"
}
```

---

## 4️⃣ STEP 4: Validation - Verify AI Output

### 📍 Location: `src/lib/validation/validators.ts`

**This is the critical step**: We don't trust what the AI returns without validating it.

```typescript
// src/lib/validation/validators.ts

export function validateTriageResult(
  input: unknown,
): ValidationResult<TriageResult> {
  // ═══════════════════════════════════════════════════════════════
  // VALIDATION 1: Is it an object?
  // ═══════════════════════════════════════════════════════════════
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid AI output." };
  }

  const record = input as Record<string, unknown>;

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION 2: Extract and type-cast fields
  // ═══════════════════════════════════════════════════════════════
  const summary =
    typeof record.summary === "string" ? record.summary.trim() : "";

  const priority = record.priority as TriagePriority;
  // ('Low' | 'Medium' | 'High' | 'Critical')

  const tags = Array.isArray(record.tags) ? record.tags : [];

  const confidence =
    typeof record.confidence === "number" ? record.confidence : NaN;

  const modelUsed =
    typeof record.modelUsed === "string" ? record.modelUsed : "";

  const promptVersion =
    typeof record.promptVersion === "string" ? record.promptVersion : "";

  const durationMs =
    typeof record.durationMs === "number" ? record.durationMs : NaN;

  const requestId =
    typeof record.requestId === "string" ? record.requestId : "";

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION 3: Apply business rules
  // ═══════════════════════════════════════════════════════════════

  // Rule 1: Summary must exist and not be too long
  const SUMMARY_MAX_LENGTH = 500;
  if (!summary || summary.length > SUMMARY_MAX_LENGTH) {
    return { ok: false, error: "Summary is missing or too long." };
  }

  // Rule 2: Priority must be one of the allowed values
  const PRIORITIES: TriagePriority[] = ["Low", "Medium", "High", "Critical"];
  if (!PRIORITIES.includes(priority)) {
    return { ok: false, error: "Priority is invalid." };
  }

  // Rule 3: Tags must have between 3 and 6 items
  const TAG_MIN = 3;
  const TAG_MAX = 6;
  if (tags.length < TAG_MIN || tags.length > TAG_MAX) {
    return {
      ok: false,
      error: `Tags must be between ${TAG_MIN} and ${TAG_MAX}.`,
    };
  }

  // Rule 4: Each tag must comply with pattern (lowercase + underscores)
  const TAG_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;
  for (const tag of tags) {
    if (typeof tag !== "string" || !TAG_PATTERN.test(tag)) {
      return { ok: false, error: `Invalid tag format: "${tag}".` };
    }
  }

  // Rule 5: Confidence must be between 0 and 1
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    return { ok: false, error: "Confidence must be between 0 and 1." };
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ ALL VALIDATIONS PASSED
  // ═══════════════════════════════════════════════════════════════

  return {
    ok: true,
    value: {
      summary,
      priority,
      tags: tags as string[],
      confidence,
      modelUsed,
      promptVersion,
      durationMs,
      requestId,
    },
  };
}
```

### Validation Rules Table

| Field        | Type     | Rule                                | Valid Example            | Invalid Example         |
| ------------ | -------- | ----------------------------------- | ------------------------ | ----------------------- |
| `summary`    | string   | 1-500 chars                         | "Severe inflammation..." | "" or 501+ chars        |
| `priority`   | enum     | "Low"\|"Medium"\|"High"\|"Critical" | "High"                   | "urgent"                |
| `tags`       | string[] | 3-6 items, format `[a-z0-9_]+`      | ["arthritis", "urgent"]  | ["ARTHRITIS"] or 1 item |
| `confidence` | number   | 0 ≤ x ≤ 1                           | 0.92                     | -0.5 or 1.5             |

---

## 5️⃣ STEP 5: Persistence - Save Result

### 📍 Location: `src/lib/triageStore.ts` and `src/app/api/admin/case-triage/[id]/analyze/route.ts`

Back in the API, we save the result to memory:

```typescript
// route.ts - Lines 46-56

if (!analysis.ok) {
  // ═══════════════════════════════════════════════════════════════
  // Case 1: Error in analysis
  // ═══════════════════════════════════════════════════════════════
  recordTriageError({
    caseId,
    modelUsed: analysis.modelUsed,
    promptVersion: analysis.promptVersion,
    durationMs: analysis.durationMs,
    requestId: analysis.requestId,
    error: analysis.error,
  });

  return NextResponse.json(
    {
      error: analysis.error,
      modelUsed: analysis.modelUsed,
      promptVersion: analysis.promptVersion,
      durationMs: analysis.durationMs,
      requestId: analysis.requestId,
    },
    { status: analysis.kind === "invalid_output" ? 422 : 500 },
  );
}

// ═══════════════════════════════════════════════════════════════
// Case 2: Success - save to persistence
// ═══════════════════════════════════════════════════════════════
recordTriageResult(analysis.value, caseId);

return NextResponse.json(
  {
    caseId: caseId ?? null,
    ...analysis.value, // summary, priority, tags, confidence, etc.
  },
  { status: 200 },
);
```

### How It's Stored

```typescript
// src/lib/triageStore.ts

// ✅ Global variable (in memory)
const entries: TriageStoreEntry[] = [];

export function recordTriageResult(result: TriageResult, caseId?: string) {
  // Create entry with all metadata
  const entry: TriageStoreEntry = {
    id: crypto.randomUUID(),
    caseId: caseId ?? null,
    summary: result.summary,
    priority: result.priority,
    tags: result.tags,
    confidence: result.confidence,
    modelUsed: result.modelUsed,
    promptVersion: result.promptVersion,
    durationMs: result.durationMs,
    requestId: result.requestId,
    createdAt: new Date().toISOString(),
    status: "success", // or "error"
  };

  // Add to beginning of array (most recent first)
  entries.unshift(entry);

  return entry;
}
```

### Stored Structure

```typescript
type TriageStoreEntry = {
  id: string; // Unique UUID
  caseId: string | null; // Case ID (can be ad-hoc)
  summary?: string; // Analysis summary
  priority?: TriagePriority; // Low | Medium | High | Critical
  tags?: string[]; // List of tags
  confidence?: number; // 0-1
  modelUsed: string; // Model name used
  promptVersion: string; // Prompt version
  durationMs: number; // Processing time
  requestId: string; // ID for tracing
  createdAt: string; // ISO timestamp
  status: "success" | "error"; // Status
  error?: string; // If there was an error
};
```

---

## 6️⃣ STEP 6: UI Display - Show to User

### 📍 Location: `src/hooks/useTriageAnalysis.ts` → `src/components/ResultPanel.tsx`

The hook receives the response and updates the React state:

```typescript
// src/hooks/useTriageAnalysis.ts - Lines 58-73

const data = (await response.json()) as TriageResponse | TriageErrorResponse;

if (!response.ok && "error" in data) {
  // ═══════════════════════════════════════════════════════════════
  // Show error
  // ═══════════════════════════════════════════════════════════════
  setError(data.error ?? "Unexpected error.");
  setMeta({
    requestId: data.requestId ?? "unknown",
    modelUsed: data.modelUsed ?? "unknown",
    promptVersion: data.promptVersion ?? "unknown",
    durationMs: data.durationMs ?? 0,
  });
  return;
}

// ═══════════════════════════════════════════════════════════════
// Show success
// ═══════════════════════════════════════════════════════════════
setResult(data as TriageResponse);
```

### ResultPanel Rendering

```typescript
// src/components/ResultPanel.tsx

export function ResultPanel({ result }: { result: TriageResponse | null }) {
  if (!result) return null;

  return (
    <div className="result-panel">
      {/* Priority with color */}
      <div className={`priority priority-${result.priority.toLowerCase()}`}>
        {result.priority}
      </div>

      {/* Summary */}
      <p className="summary">{result.summary}</p>

      {/* Tags */}
      <div className="tags">
        {result.tags.map((tag) => (
          <span key={tag} className="tag">
            #{tag}
          </span>
        ))}
      </div>

      {/* Confidence */}
      <div className="confidence">
        <label>Confidence:</label>
        <div className="bar">
          <div
            className="fill"
            style={{ width: `${result.confidence * 100}%` }}
          />
        </div>
        <span>{(result.confidence * 100).toFixed(0)}%</span>
      </div>

      {/* Metadata */}
      <footer className="meta">
        <small>Model: {result.modelUsed}</small>
        <small>Duration: {result.durationMs}ms</small>
        <small>Request ID: {result.requestId}</small>
      </footer>
    </div>
  );
}
```

---

## 🎯 Validation Layers Summary

```
┌────────────────────────────────────────────────────────────────────┐
│                      VALIDATION LAYERS                             │
└────────────────────────────────────────────────────────────────────┘

    ╔═══════════════════════════════════════════════╗
    ║  LAYER 1: CLIENT VALIDATION (React)          ║
    ║  • noteText.length >= 1000 && <= 5000        ║
    ║  • caseId is string (optional)               ║
    ║  ✓ Improves UX (immediate feedback)          ║
    ╚═══════════════════════════════════════════════╝
              ↓
    ╔═══════════════════════════════════════════════╗
    ║  LAYER 2: SECURITY (API route)               ║
    ║  • Validate headers x-admin, x-permission    ║
    ║  ✓ Stops unauthorized requests               ║
    ╚═══════════════════════════════════════════════╝
              ↓
    ╔═══════════════════════════════════════════════╗
    ║  LAYER 3: INPUT SCHEMA (API route)           ║
    ║  • Valid JSON                                ║
    ║  • noteText has correct size                 ║
    ║  • caseId is valid string                    ║
    ║  ✓ Validates before touching AI             ║
    ╚═══════════════════════════════════════════════╝
              ↓
    ╔═══════════════════════════════════════════════╗
    ║  LAYER 4: AI PROCESSING (service.ts)         ║
    ║  • Prompt construction                       ║
    ║  • Model call                                ║
    ║  • JSON parsing                              ║
    ║  ✓ Catches AI errors                         ║
    ╚═══════════════════════════════════════════════╝
              ↓
    ╔═══════════════════════════════════════════════╗
    ║  LAYER 5: OUTPUT SCHEMA (validators.ts)      ║
    ║  • summary: 1-500 chars                      ║
    ║  • priority: Low|Medium|High|Critical        ║
    ║  • tags: 3-6 items, format [a-z0-9_]+       ║
    ║  • confidence: 0 <= x <= 1                   ║
    ║  ✓ CRITICAL: Never trust AI output           ║
    ╚═══════════════════════════════════════════════╝
              ↓
    ╔═══════════════════════════════════════════════╗
    ║  LAYER 6: PERSISTENCE (triageStore.ts)       ║
    ║  • Save to memory with metadata              ║
    ║  • Record timestamps, request IDs            ║
    ║  ✓ Audit and debugging                       ║
    ╚═══════════════════════════════════════════════╝
              ↓
    ╔═══════════════════════════════════════════════╗
    ║  LAYER 7: UI RENDERING (React)               ║
    ║  • Show result to user                       ║
    ║  • Safe format (auto-escaped)                ║
    ║  ✓ Clear and responsive UX                   ║
    ╚═══════════════════════════════════════════════╝
```

---

## 💡 Key Concepts

### Trust Boundaries

Every time we cross a boundary, we validate:

```
┌──────────────┐
│   CLIENT     │  Client validation
└──────┬───────┘
       │ ⚠️ TRUST BOUNDARY - Validate input
       ▼
┌──────────────┐
│   SERVER     │  Server validation + Auth
└──────┬───────┘
       │ ⚠️ TRUST BOUNDARY - Validate before AI
       ▼
┌──────────────┐
│   AI MODEL   │  Processing
└──────┬───────┘
       │ ⚠️ TRUST BOUNDARY - NEVER trust output without validation
       ▼
┌──────────────┐
│  DATABASE    │  Safe persistence
└──────────────┘
```

### Error Handling

```typescript
// We differentiate error types
- 400: Bad Request (invalid input)
- 401: Unauthorized (no permissions)
- 403: Forbidden (insufficient permissions)
- 422: Unprocessable Entity (invalid AI output)
- 500: Internal Server Error (provider error)
```

### Request Tracing

Each request has a `requestId` to trace the complete flow:

```
1. Client sends request
2. API creates requestId = "a1b2c3d4..."
3. Passed to analyzeCaseNote()
4. Included in response to client
5. Saved in persistence with requestId
6. Client can check status with requestId
```

---

## 📋 Comparative Flow Table

| Scenario             | Path                                                 | Status | Result                       |
| -------------------- | ---------------------------------------------------- | ------ | ---------------------------- |
| ✅ Complete success  | UI → API (✓) → AI (✓) → Validation (✓) → DB (✓) → UI | 200    | Result displayed             |
| ❌ Invalid input     | UI → API (✗)                                         | 400    | Error: "Invalid note length" |
| ❌ No permissions    | UI → API (✗)                                         | 401    | Error: "Unauthorized"        |
| ❌ AI error          | UI → API (✓) → AI (✗)                                | 500    | Error: "Provider error"      |
| ❌ Invalid AI output | UI → API (✓) → AI (✓) → Validation (✗)               | 422    | Error: "Invalid priority"    |

---

## 🚀 Complete Code Flow (Real Example)

### User Input:

```typescript
{
  noteText: "The patient presents symptoms of severe inflammation...",
  caseId: "CASE-2026-001"
}
```

### Client validates:

```typescript
noteText.length = 1250; // ✓ Between 1000-5000
caseId.length = 13; // ✓ Valid string
```

### API receives and validates:

```typescript
// ✓ Permissions: x-admin: true, x-permission: triage:write
// ✓ JSON: Valid
// ✓ Schema: noteText and caseId present
```

### AI Service processes:

```typescript
prompt = buildPrompt("The patient presents...")
response = simulateModelResponse(prompt)
// Returns:
{
  summary: "Severe inflammation, requires evaluation...",
  priority: "High",
  tags: ["inflammatory", "urgent", "arthritis"],
  confidence: 0.92,
  modelUsed: "gpt-4",
  promptVersion: "v1.0",
  durationMs: 245,
  requestId: "uuid"
}
```

### Validation checks:

```typescript
✓ summary: 98 chars (1-500)
✓ priority: "High" (valid)
✓ tags: 3 items, correct format
✓ confidence: 0.92 (0-1)
```

### Persistence stores:

```typescript
entries.push({
  id: "uuid-1",
  caseId: "CASE-2026-001",
  summary: "Severe inflammation...",
  priority: "High",
  tags: ["inflammatory", "urgent", "arthritis"],
  confidence: 0.92,
  modelUsed: "gpt-4",
  promptVersion: "v1.0",
  durationMs: 245,
  requestId: "uuid",
  createdAt: "2026-05-11T10:30:00Z",
  status: "success",
});
```

### UI renders:

```
┌─────────────────────────────────────┐
│  PRIORITY: HIGH                     │
├─────────────────────────────────────┤
│  Severe inflammation, requires...   │
├─────────────────────────────────────┤
│  #inflammatory #urgent #arthritis   │
├─────────────────────────────────────┤
│  Confidence: ████████░░ 92%         │
├─────────────────────────────────────┤
│  Model: gpt-4 | Duration: 245ms     │
│  Request ID: uuid                   │
└─────────────────────────────────────┘
```

---

## 🔍 Debugging with Request ID

If something fails, you use the `requestId` to trace:

```bash
# Search in logs
grep "uuid" logs/triage.log

# Complete information
{
  requestId: "uuid",
  timestamp: "2026-05-11T10:30:00Z",
  input: { noteText: "...", caseId: "CASE-2026-001" },
  aiResponse: { ... },
  validation: { ok: true },
  persistence: { saved: true },
  duration: 245
}
```

---

## ✅ Security Checklist

- [ ] **Client Validation**: Immediate feedback to user
- [ ] **Auth Headers**: Verify x-admin and x-permission
- [ ] **Input Validation**: Strict schema before AI
- [ ] **Error Handling**: Different status codes
- [ ] **Output Validation**: NEVER trust AI output without validation
- [ ] **Persistence**: Save with metadata for audit trail
- [ ] **Request Tracing**: requestId throughout flow
- [ ] **UI Safety**: Don't inject HTML without escaping

---

## 🧭 Quick Guide to Better Understanding the Project

There are several ways to understand the project better:

### 📚 1. Read existing documentation

- `README.md` → General explanation
- `case-triage-plan.md` → Project plan
- `interview-qa.md` → Frequently asked questions

### 🔄 2. Follow the data flow (most important)

User fills form → `page.tsx` (UI)
↓
Hook sends request → `useTriageAnalysis.ts` (state)
↓
API receives and validates → `route.ts` (authentication + validators)
↓
Service analyzes → `service.ts` (main logic)
↓
Saves to memory → `triageStore.ts` (persistence)
↓
Response to user → `page.tsx` (`ResultPanel` shows result)

### 🧪 3. Read the tests

Tests show how the code is supposed to work:

- `triageSchemas.test.ts` → Validation cases
- `src/app/api/admin/case-triage/[id]/analyze/route.test.ts` → API scenarios
- `page.test.tsx` → UI behavior

### 🏗️ 4. Understand the structure

- `src/lib/validation/` ← Types + validators (what enters and what exits)
- `src/lib/triage/` ← Analysis logic (prompt, rules, model)
- `src/lib/auth.ts` ← Access control
- `src/lib/triageStore.ts` ← Where data lives
- `src/app/components/` ← UI components
- `src/app/api/` ← Endpoint

### 💡 5. Key concepts to understand

- `ValidationResult<T>` → Generic type that says if something is valid or not
- discriminated unions (the `|` you asked about) → TypeScript knows what fields exist based on type
- `async/await` → The API is asynchronous (waits for analysis to finish)
- `headers` → Authentication via `x-admin` and `x-permission`

### 🎮 6. Test the project

npm run dev # Start server
npm run test # Run tests

Then open http://localhost:3000 and test the form.

---
