

## Migration from External Supabase to Lovable Cloud

### The Reality

**Lovable Cloud IS Supabase** — it's just a Supabase instance managed by Lovable. The migration is essentially: disconnect the external Supabase project, then Lovable will provision a new managed Supabase instance for you automatically.

### What I Have Full Visibility Into

**Database (32 tables):**
- Most tables are empty or near-empty (this is a young project)
- Notable data: 271 easy_chat_sessions, 109 ai_usage_tracking, 99 conversation_solutions, 54 health_episodes, 29 health_topics, 16 messages, 6 profiles, 6 patients, 5 subscribers, 5 health_records
- Total meaningful records: ~600

**Edge Functions (35 functions):** All code is already in your codebase under `supabase/functions/`. These will auto-deploy to the new instance.

**66 migrations:** These define the full schema and will replay on the new instance.

**Secrets needed:** STRIPE_SECRET_KEY, OPENAI_API_KEY, GROK_API_KEY, ALPHA_TESTER_CODE

**Storage buckets:** health-records, chat-images (both private)

### Migration Plan

#### Step 1: Document everything (before disconnect)
- Export all migration SQL files (already in codebase ✓)
- Export all edge function code (already in codebase ✓)
- Note all secrets that need re-adding
- Note storage bucket configurations

#### Step 2: Disconnect external Supabase
- Use `standard_connectors--disconnect` to unlink the external project
- The app will break temporarily

#### Step 3: Lovable Cloud provisions new Supabase
- After disconnect, Lovable will offer to set up a managed Supabase instance
- All 66 migrations will replay, recreating every table, RLS policy, function, and trigger
- All 35 edge functions will auto-deploy

#### Step 4: Re-add secrets
- You'll need to re-add: STRIPE_SECRET_KEY, OPENAI_API_KEY, GROK_API_KEY, ALPHA_TESTER_CODE
- I'll prompt you for each one

#### Step 5: Recreate storage buckets
- Create `health-records` and `chat-images` buckets (private)

#### Step 6: Update client configuration
- The `src/integrations/supabase/client.ts` will auto-update with new project credentials

### What You Lose

- **All 6 user accounts** (auth users — passwords are hashed, cannot migrate)
- **All data** (~600 records across tables) — users will need to re-register
- **Stripe customer associations** — existing subscribers will need to re-subscribe
- **Google Auth config** (if you set it up) — will need to reconfigure with new Supabase URL

### What You Keep

- **All code** — everything is in the repo
- **All schema** — 66 migrations replay automatically
- **All edge functions** — 35 functions auto-deploy
- **All RLS policies** — defined in migrations

### Important Note

I cannot initiate the Lovable Cloud setup from plan mode. Once you approve this plan, I'll:
1. Disconnect the external Supabase connection
2. Guide you through the Lovable Cloud setup
3. Re-add all secrets
4. Recreate storage buckets
5. Verify everything works

### Technical Details

The `src/integrations/supabase/client.ts` currently hardcodes the external project URL and anon key. After Lovable Cloud setup, this file will be auto-regenerated with the new credentials. The `.env` file will also update automatically.

