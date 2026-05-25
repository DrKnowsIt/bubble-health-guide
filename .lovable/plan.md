# Mobile UI Audit & Polish

## What I checked

Loaded the preview at iPhone-size (390×844) and walked through the landing page, age-gate, cookie banner, demo chat, and reviewed the responsive code paths for the dashboard, chat, pricing, and auth screens.

## What's already good

- Header has a working hamburger + slide-down menu (`Header.tsx`).
- Dashboard already swaps to bottom-tab nav with safe-area padding (`UserDashboard.tsx` lines 433-484), uses dedicated `MobileEnhancedChatInterface`, `MobileEnhancedHealthTab`, `MobileEnhancedOverviewTab`.
- Landing page renders a phone-specific hero + inline demo chat (`Index.tsx` mobile branch).
- PWA manifest, install prompt, and safe-area insets are wired.

## Issues found

1. **Landing demo chat is cramped on mobile.** `Index.tsx` uses `h-[100dvh] flex flex-col` with a `shrink-0` scrollable hero and a `flex-1` chat region — but the hero is taller than the screen on small phones, so the chat area collapses to near-zero before scroll. Result: input bar can be hidden by the `Deep analysis ready` badge / install prompt.
2. **Cookie banner + install prompt + chat input can stack** at the bottom on mobile, overlapping the chat input.
3. **Landing hero CTA is missing on mobile.** Desktop has the inline chat affordance; mobile lacks any explicit "Sign up / Try it" button above the fold, so the value prop has no action.
4. **Dashboard mobile bottom-tabs** size `Report` tab differently from the other tabs (`py-2`/`gap-0.5` for siblings vs `py-3`/`gap-1`) → uneven heights.
5. **`MobileEnhancedChatInterface` patient-selector + history bar uses two stacked rows**, eating ~120px of vertical space before the first message. Can be collapsed into one row.
6. **Tap target sizes** on landing hero (the small "Trusted by" pill, "Information only" warning) are decorative but inside scroll area — fine; however the `Deep analysis ready` floating badge has no dismiss and overlays content.
7. **Pricing page** uses `grid-cols-1 md:grid-cols-2` — fine, but plan cards have wide internal padding (`p-8`) that pushes CTA below the fold on iPhone SE.
8. **Auth page** (`Auth.tsx`, 507 lines) — needs a quick check that the form, password reset, and Google button stack cleanly on 360px.
9. **Horizontal overflow risk** in `ChatMessage` for long URLs/code blocks on phones (need `break-words`/`overflow-x-auto` for code).
10. **iOS input zoom**: text inputs without `font-size: 16px` will trigger zoom on focus. Need to audit chat `<Textarea>` and auth inputs.

## Changes

### Landing (`src/pages/Index.tsx`)
- Replace fixed `h-[100dvh]` split with natural document flow on mobile so the hero scrolls normally and the demo chat sits as its own full-height section below.
- Add a prominent "Get Started Free" CTA button in the mobile hero just under the disclaimer.
- Lower hero image aspect to `4/3` → `16/10` so more text+CTA is visible above the fold.

### Header (`src/components/Header.tsx`)
- Add `safe-area-inset-top` padding so the sticky header isn't clipped under iOS notch.
- Close mobile menu on route change (currently relies on click handler on each link — works, but add an effect for safety).

### Dashboard bottom-tabs (`src/pages/UserDashboard.tsx`)
- Normalize all `TabsTrigger` and the Report `Button` to the same height (`h-14`, `gap-0.5`, `py-2`, icon `h-5 w-5`).
- Ensure the `Report` button sits inside `TabsList` grid so it doesn't break alignment.

### Mobile chat (`src/components/chat/MobileEnhancedChatInterface.tsx`)
- Collapse the two header rows (patient + actions) into one compact row: patient pill on the left, history + new chat icons on the right. Saves ~60px.
- Add `text-base` (16px) to the input `Textarea` to prevent iOS zoom-on-focus.
- Add `pb-[env(safe-area-inset-bottom)]` to the input footer.

### Chat message (`src/components/chat/ChatMessage.tsx`)
- Add `break-words` and `max-w-full` on the bubble; wrap `<pre>`/`<code>` in `overflow-x-auto`.

### Install / cookie banners
- `InstallPrompt.tsx` and `CookieConsent.tsx`: ensure only one is visible at a time on mobile (cookie first, install after dismissed) and both honor safe-area-inset-bottom.

### Pricing (`src/pages/Pricing.tsx`)
- Reduce card padding on mobile (`p-5 sm:p-8`), tighten feature list spacing, ensure CTA is always above the fold on a 375px screen.

### Auth (`src/pages/Auth.tsx`)
- Set all inputs to `text-base` to stop iOS zoom; ensure form max-width is `w-full max-w-sm mx-auto` with vertical padding to avoid keyboard overlap.

### Misc
- Remove or auto-hide the persistent "Deep analysis ready · Ready" footer on the public landing page (it belongs to the chat component but should not float over the demo input on small screens — make it inline above the input instead).

## Out of scope

- No backend / RLS / edge function changes.
- No new features; layout + spacing + iOS polish only.
- Desktop and tablet layouts untouched except where shared components are edited (changes are mobile-conditional via Tailwind breakpoints).

## Verification

After edits, re-screenshot at 360×640, 390×844, and 414×896, then walk through: landing → demo chat → sign-up CTA → pricing → auth → (with test account) dashboard → mobile chat → bottom tabs → report button.
