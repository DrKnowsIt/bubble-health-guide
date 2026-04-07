

# Site Health Audit & Fix Plan

## Issues Found

### 1. Missing Foreign Key: `health_record_summaries` → `health_records` (CRITICAL)
The `health_record_summaries` table has a `health_record_id` column but NO foreign key constraint to `health_records`. This causes the repeated console error:
```
"Could not find a relationship between 'health_records' and 'health_record_summaries' in the schema cache"
```
This breaks `useStrategicReferencing.tsx` (uses `!inner` join) and `ComprehensivePDFExport.tsx` (uses nested select `health_records(...)`).

**Fix:** Add a foreign key constraint via migration:
```sql
ALTER TABLE public.health_record_summaries
  ADD CONSTRAINT health_record_summaries_health_record_id_fkey
  FOREIGN KEY (health_record_id) REFERENCES public.health_records(id) ON DELETE CASCADE;
```

### 2. `useStrategicReferencing.tsx` — Silent failure on missing FK
Even after adding the FK, this hook silently swallows errors. The `!inner` join is correct once the FK exists, but needs a graceful fallback if the table is empty.

**Fix:** No code change needed — the FK migration resolves this.

### 3. `ComprehensivePDFExport.tsx` — Reverse nested select also needs FK
Line 169 does `health_records(...)` from `health_record_summaries`. This is the reverse direction and also requires the FK to exist.

**Fix:** Same migration resolves this.

### 4. Realtime channel cleanup pattern
The current code correctly removes existing channels before re-subscribing. However, `ChatGPTInterface.tsx` line 161 creates a `diagnosis-realtime-${currentConversation}` channel without the cleanup pattern used elsewhere.

**Fix:** Add the `removeChannel` before subscribe pattern to the diagnosis realtime subscription in `ChatGPTInterface.tsx`.

### 5. `analyze-health-topics` edge function — May still 500
The current code has robust JSON parsing with retry. However, checking the logs shows no recent logs, meaning either it hasn't been called or the deployment didn't take. Need to verify deployment and test.

**Fix:** Re-deploy `analyze-health-topics` and test with curl to confirm it works.

### 6. Landing page chat for unauthenticated users
Unauthenticated users see a `DemoConversation` (static messages) which is fine. The chat input shows "Subscribe to start chatting..." and is disabled. This is correct behavior.

No fix needed.

### 7. Console warning: "No user ID available for conversations query"
This fires on the landing page before auth redirect happens. It's harmless but noisy — the hook has an early return for no user.

**Fix:** Downgrade from `console.warn` to `console.debug` or remove, since it fires on every unauthenticated page load.

---

## Implementation Steps

1. **Database migration** — Add FK from `health_record_summaries.health_record_id` to `health_records.id`
2. **Fix diagnosis realtime channel** in `ChatGPTInterface.tsx` — add `removeChannel` cleanup pattern
3. **Reduce console noise** in `useConversationsQuery.tsx` — downgrade the "no user" warning
4. **Re-deploy & test** `analyze-health-topics` edge function
5. **Quick smoke test** — verify the dashboard loads without errors

## Technical Details

- The FK migration is safe because both tables exist and `health_record_id` already references health records by design — just missing the formal constraint
- The realtime fix follows the same pattern already applied to conversations and messages channels
- Edge function re-deployment ensures the latest JSON parsing hardening is live

