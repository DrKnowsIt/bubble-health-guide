
## Website Review & Improvements Plan

### Important Note
**Cannot switch to Lovable Cloud** — your project is connected to an external Supabase instance with all your data, edge functions, and RLS policies. Migrating would require recreating everything.

### Google Auth Setup
Google Auth requires configuration in your **Supabase Dashboard** (not code-only). Here's what's needed:

**You need to do in Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com) → Create OAuth 2.0 credentials (Web application)
2. Add `https://lwqfurkfjkilsnjtmemj.supabase.co` as authorized JavaScript origin
3. Add `https://lwqfurkfjkilsnjtmemj.supabase.co/auth/v1/callback` as authorized redirect URL
4. Also add your site URL (`https://bubble-health-guide.lovable.app`) as authorized JavaScript origin

**You need to do in Supabase Dashboard:**
1. Go to [Authentication → Providers](https://supabase.com/dashboard/project/lwqfurkfjkilsnjtmemj/auth/providers)
2. Enable Google provider
3. Paste your Google Client ID and Client Secret

**I will add to the code:**
- A "Sign in with Google" button on the Auth page (`src/pages/Auth.tsx`)
- Google sign-in handler using `supabase.auth.signInWithOAuth({ provider: 'google' })`

---

### Fix 1: User Counter Display (the count is 6 — working correctly)
The `get_total_user_count()` RPC returns 6, which is accurate. If you want it to appear larger for social proof, I can add a minimum display threshold (e.g., show "100+" as a floor). Otherwise, the counter is functioning correctly.

### Fix 2: Add Google Sign-In Button to Auth Page
**File:** `src/pages/Auth.tsx`
- Add a "Continue with Google" button with Google icon above the email form
- Add a divider ("or continue with email")
- Call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } })`

### Fix 3: Auth Page Brand Name Inconsistency
**File:** `src/pages/Auth.tsx` line 306
- Says "DrKnowItAll" instead of "DrKnowsIt" — fix the typo

### Fix 4: Remove Excessive Console Logging
**File:** `src/components/chat/ChatGPTInterface.tsx`
- Guard debug console.log calls behind `import.meta.env.DEV` check to improve production performance

### Fix 5: Desktop Chat Message Markdown Support
**File:** `src/components/chat/ChatGPTInterface.tsx`
- AI responses currently render as plain text. Add basic markdown rendering (bold, lists, line breaks) using the existing `ChatMessage` component or simple regex-based formatting

### Fix 6: Mobile Landing Page — Info Sections Overlap
**File:** `src/pages/Index.tsx` line 179
- The `mt-4 px-4 pb-20` sections (HowItWorks, Features) render below the full-height chat section on mobile but may be inaccessible since the chat takes `100dvh`. Add scroll behavior or move these sections to be more discoverable.

---

### Technical Details

**Files to modify:**
1. `src/pages/Auth.tsx` — Add Google OAuth button, fix "DrKnowItAll" typo
2. `src/components/chat/ChatGPTInterface.tsx` — Add markdown rendering for AI messages, reduce console logging
3. `src/pages/Index.tsx` — Fix mobile info sections accessibility

**No database changes needed.** Google Auth is configured entirely in the Supabase dashboard + Google Cloud Console.
