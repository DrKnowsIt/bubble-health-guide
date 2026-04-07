
## Landing Page Modernization

### Problems
- Oversized headings (text-5xl) with loose line-height feel juvenile
- Excessive rounded corners (rounded-2xl everywhere) look bubbly
- Cartoon hero/doctor images undermine credibility
- Large icon containers (h-14 w-14) with gradient backgrounds feel like a kids app
- Loose padding (p-8) and spacing makes cards feel inflated
- "gradient-bubble" solid teal blocks look flat and dated
- Development banner is too prominent
- Feature card benefits with CheckCircle icons are visually noisy
- CTA card with inline badges feels cluttered
- "How It Works" step numbers with overlapping badges look toy-like

### Changes

#### 1. Typography refinement (Index.tsx + LandingPageComponents.tsx)
- Hero: `text-5xl` → `text-4xl lg:text-5xl` with `tracking-tight` and `font-extrabold`
- Section headings: Remove `gradient-text`, add `tracking-tight`
- Body text: tighten `leading-relaxed` to `leading-normal` where excessive
- Add letter-spacing `-0.025em` on display text

#### 2. Reduce border-radius globally
- Cards: `rounded-2xl` → `rounded-xl`
- Icon containers: `rounded-2xl` → `rounded-xl`
- Hero image: keep `rounded-2xl` but add subtle border

#### 3. Modernize hero section (Index.tsx)
- Replace the cartoon doctor image reference with a more professional presentation
- Add `border border-border/50` to image container for polish
- Tighten grid gap from `gap-16` → `gap-12`
- Reduce description paragraph length

#### 4. Slim down feature cards (LandingPageComponents.tsx)
- Icon containers: `h-14 w-14` → `h-11 w-11`, icons `h-7 w-7` → `h-5 w-5`
- Card padding: `p-8` → `p-6`
- Remove hover-scale class, use subtle `hover:border-primary/30` instead
- Simplify benefits: remove CheckCircle icons, use `·` separator inline

#### 5. Modernize How It Works steps
- Remove cartoon doctor image or replace with abstract visual
- Step numbers: simplify to text-only numbered badges
- Tighten step card padding
- Remove `group-hover:scale-[1.02]`

#### 6. Refine CTA section
- Reduce padding, tighten copy
- Single prominent button, remove badge clutter below

#### 7. Development banner
- Make slimmer, reduce font weight

#### 8. Technical accuracy card
- Reduce padding, make more compact

### Files Modified
- `src/pages/Index.tsx` — hero section, spacing, development banner
- `src/components/LandingPageComponents.tsx` — features, HowItWorks, CTA, footer
- `src/index.css` — minor utility refinements

### No structural/routing/backend changes needed
