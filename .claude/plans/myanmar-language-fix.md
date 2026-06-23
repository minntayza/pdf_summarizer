# Plan: Fix Myanmar Language Output Hanging

## Problem
When user selects "Myanmar" as output language, processing hangs indefinitely at "Starting AI processing…" (15%). The user sees zero progress feedback.

## Root Cause Analysis
1. **Edge Function blocks HTTP response until all processing is done** (`supabase/functions/process-pdf/index.ts:524`) — the function `await`s the entire AI pipeline before returning
2. **Frontend waits for function response before polling** (`frontend/upload.html:269`) — `startPoll()` only called AFTER `sb.functions.invoke()` returns
3. **No fetch timeout on AI API calls** — if the model hangs or is very slow, the function waits forever
4. **Myanmar generation is inherently slower** — Burmese Unicode + JSON takes more tokens/time to generate than English

## Files to Change

### 1. `supabase/functions/process-pdf/index.ts` — Make processing asynchronous

**Change POST handler (around line 500-536):**
- Return 202 response immediately after DB insert
- Use `EdgeRuntime.waitUntil()` to continue processing in background
- The frontend will poll the documents table for progress independently

**Change `callClaude` and `callGemini` functions:**
- Add `AbortController` with a 4-minute timeout per API call
- Prevents indefinite hanging if the AI model is slow

**Fix `ANTHROPIC_BASE_URL` double `/v1` (line 58-61):**
- Default is `https://api.anthropic.com/v1` but code appends `/v1/messages` → results in `/v1/v1/messages`
- Fix: remove trailing `/v1` from default or remove `/v1` from fetch path

### 2. `frontend/upload.html` — Start polling immediately

**Change `doUpload()` function (around line 263-269):**
- Move `startPoll(docId, uid)` to BEFORE `sb.functions.invoke()`
- The function invoke triggers processing; polling reads progress independently
- User will see real-time progress updates (10%, 20%, 30%, etc.) instead of being stuck at 15%

## Impact
- All languages benefit from immediate progress feedback
- Myanmar (and other non-Latin languages) won't appear to hang — even if slow, user sees progress
- AI API calls have a safety timeout to prevent infinite hangs
