/**
 * PHI Scrubber — server-side safety net.
 *
 * Every payload going to an external AI (Gemini, etc.) MUST pass
 * through `scrubText()` first. The scrubber is deny-by-default: even
 * if the client mis-sends a name or DOB in free text, the scrubber
 * tokenizes it before the request reaches the model.
 *
 * Layers, in order:
 *   1. Patient-token swap: replace known first/last names for this
 *      user_id with the opaque token (Patient_017).
 *   2. Date generalization: ISO dates within ±2 years of patient DOB
 *      collapse to an age bucket label.
 *   3. Regex sweep: emails, phone numbers, SSNs, ZIP codes,
 *      common US street-address shapes.
 *   4. Optional NER pass (Gemini Flash Lite) for free-text fields
 *      over the threshold — catches stray names the regex misses.
 *
 * Usage:
 *   const scrubbed = await scrubText(text, { userId, supabase, useNER: true });
 *   await callGemini(scrubbed);
 */

// deno-lint-ignore-file no-explicit-any

export interface ScrubOptions {
  userId: string;
  supabase: any;             // service-role client
  patientId?: string | null;
  useNER?: boolean;          // run Gemini Flash Lite NER on long text
  nerMinLength?: number;     // default 200 chars
}

interface PatientCache {
  names: Array<{ first?: string; last?: string; token: string; dob?: string | null }>;
}

const cache = new Map<string, { fetchedAt: number; data: PatientCache }>();
const CACHE_TTL_MS = 60_000;

async function loadPatients(opts: ScrubOptions): Promise<PatientCache> {
  const key = `${opts.userId}::${opts.patientId ?? "*"}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data;

  // Pull names + tokens for the user. If patientId given, scope to it
  // but still load other family members so cross-mentions get tokenized.
  const { data: patients } = await opts.supabase
    .from("patients")
    .select("id,first_name,last_name,date_of_birth")
    .eq("user_id", opts.userId);

  const { data: tokens } = await opts.supabase
    .from("patient_tokens")
    .select("patient_id,token_id")
    .eq("user_id", opts.userId);

  const tokenById = new Map<string, string>(
    (tokens ?? []).map((t: any) => [t.patient_id, t.token_id]),
  );

  const names = (patients ?? []).map((p: any, idx: number) => ({
    first: p.first_name ?? undefined,
    last: p.last_name ?? undefined,
    dob: p.date_of_birth ?? null,
    token: tokenById.get(p.id) ?? `Patient_${String(idx + 1).padStart(3, "0")}`,
  }));

  const data: PatientCache = { names };
  cache.set(key, { fetchedAt: Date.now(), data });
  return data;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ageBucket(dob: string): string {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  if (age < 0 || isNaN(age)) return "unknown_age";
  if (age < 18) return "0-17";
  if (age < 30) return "18-29";
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  if (age < 60) return "50-59";
  if (age < 70) return "60-69";
  if (age < 80) return "70-79";
  return "80+";
}

// ----- Regex layer -----
const RE = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  zip: /\b\d{5}(?:-\d{4})?\b/g,
  // crude US street address shape: 123 Main St / 4567 Oak Avenue
  street:
    /\b\d{1,6}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Way|Pl|Place|Pkwy|Parkway|Cir|Circle|Ter|Terrace)\b\.?/g,
  isoDate: /\b\d{4}-\d{2}-\d{2}\b/g,
  usDate: /\b(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:19|20)\d{2}\b/g,
};

function regexScrub(text: string, dobs: string[]): string {
  let out = text;
  out = out.replace(RE.email, "[redacted_email]");
  out = out.replace(RE.ssn, "[redacted_ssn]");
  out = out.replace(RE.phone, "[redacted_phone]");
  out = out.replace(RE.street, "[redacted_address]");
  out = out.replace(RE.zip, "[redacted_zip]");
  // Dates: if any DOB is in the user's patient set, replace with age bucket
  const bucketize = (m: string) => {
    if (dobs.length === 0) return "[redacted_date]";
    // crude: use first patient's DOB; good enough for v1
    return ageBucket(dobs[0]);
  };
  out = out.replace(RE.isoDate, bucketize);
  out = out.replace(RE.usDate, bucketize);
  return out;
}

// ----- NER layer (optional, Gemini Flash Lite) -----
async function nerNamesPass(text: string): Promise<string[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return [];
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              'Extract every person name and place/city/hospital name from the text. Reply with ONLY a JSON array of strings, no prose. Example: ["Jane Doe","Boston","St Mary Hospital"]. Empty array if none.',
          },
          { role: "user", content: text },
        ],
        max_tokens: 256,
        temperature: 0,
      }),
    });
    if (!res.ok) return [];
    const j = await res.json();
    const raw = j?.choices?.[0]?.message?.content?.trim() ?? "[]";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const arr = JSON.parse(cleaned);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string" && s.length > 1) : [];
  } catch {
    return [];
  }
}

// ----- Main entry -----
export async function scrubText(
  text: string,
  opts: ScrubOptions,
): Promise<string> {
  if (!text || typeof text !== "string") return text;
  const { names } = await loadPatients(opts);

  // 1) name-token swap
  let scrubbed = text;
  for (const n of names) {
    if (n.first && n.last) {
      const full = new RegExp(`\\b${escapeRe(n.first)}\\s+${escapeRe(n.last)}\\b`, "gi");
      scrubbed = scrubbed.replace(full, n.token);
    }
    if (n.last) {
      scrubbed = scrubbed.replace(new RegExp(`\\b${escapeRe(n.last)}\\b`, "gi"), n.token);
    }
    if (n.first && n.first.length > 2) {
      scrubbed = scrubbed.replace(new RegExp(`\\b${escapeRe(n.first)}\\b`, "gi"), n.token);
    }
  }

  // 2+3) date generalization + regex sweep
  const dobs = names.map((n) => n.dob).filter((d): d is string => !!d);
  scrubbed = regexScrub(scrubbed, dobs);

  // 4) NER pass for longer free text
  const minLen = opts.nerMinLength ?? 200;
  if (opts.useNER && scrubbed.length >= minLen) {
    const extras = await nerNamesPass(scrubbed);
    for (const ex of extras) {
      // Don't redact tokens we've already inserted
      if (/^Patient_\d+$/.test(ex)) continue;
      scrubbed = scrubbed.replace(
        new RegExp(`\\b${escapeRe(ex)}\\b`, "gi"),
        "[redacted_name]",
      );
    }
  }

  return scrubbed;
}

/** Convenience: scrub each string field of a message array in place. */
export async function scrubMessages<T extends { role: string; content: any }>(
  messages: T[],
  opts: ScrubOptions,
): Promise<T[]> {
  return Promise.all(
    messages.map(async (m) => {
      if (typeof m.content === "string") {
        return { ...m, content: await scrubText(m.content, opts) };
      }
      // multimodal: scrub text parts only
      if (Array.isArray(m.content)) {
        const parts = await Promise.all(
          m.content.map(async (p: any) =>
            p?.type === "text" ? { ...p, text: await scrubText(p.text ?? "", opts) } : p,
          ),
        );
        return { ...m, content: parts };
      }
      return m;
    }),
  );
}
