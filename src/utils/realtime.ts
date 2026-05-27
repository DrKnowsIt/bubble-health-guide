import { supabase } from "@/integrations/supabase/client";

/**
 * Remove any existing Supabase realtime channel(s) matching the given name.
 *
 * `supabase.channel(name)` does NOT return an existing channel — it always
 * creates a fresh one. Calling `removeChannel` on that fresh instance does
 * not clean up a previously-subscribed channel with the same name, which
 * leads to "cannot add postgres_changes callbacks after subscribe()" errors
 * when a hook remounts (React Strict Mode, route changes, multiple chat
 * surfaces, etc.).
 *
 * This helper inspects the live channel registry and removes any channel
 * whose topic matches `realtime:<name>`.
 */
export function removeChannelsByName(name: string): void {
  try {
    const target = `realtime:${name}`;
    const channels = supabase.getChannels?.() ?? [];
    for (const ch of channels) {
      if (ch.topic === target) {
        supabase.removeChannel(ch);
      }
    }
  } catch {
    // best-effort cleanup; never throw from here
  }
}
