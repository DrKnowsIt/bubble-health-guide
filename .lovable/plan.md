

# Improve DrKnowsIt by 5% — Bug Fixes & Enhancements

## 1. Fix: 404 Page Uses Hardcoded Colors Instead of Theme
**File:** `src/pages/NotFound.tsx`  
The NotFound page uses `bg-gray-100` and `text-gray-600` instead of theme variables (`bg-background`, `text-muted-foreground`), making it look broken in dark mode. Also add a proper branded layout with the DrKnowsIt logo and a more helpful message.

## 2. Fix: Excessive Debug Logging in Production
**Files:** `src/components/ProtectedRoute.tsx`, `src/hooks/useConversationStateGuard.tsx`  
Multiple `console.log`/`console.warn` calls fire on every render (e.g., "ProtectedRoute check", emoji-laden state logs). Downgrade to `logger.debug` to reduce console noise and improve performance.

## 3. Enhancement: Add `loading="lazy"` to Landing Page Images
**File:** `src/pages/Index.tsx`, `src/components/LandingPageComponents.tsx`  
The hero and "How It Works" images load eagerly. Adding `loading="lazy"` to below-fold images (the doctor thumbs-up image) and `fetchpriority="high"` to the hero image improves LCP and page load speed.

## 4. Enhancement: Add Accessible `aria-label` to Key Interactive Elements
**Files:** `src/components/Header.tsx`, `src/components/CookieConsent.tsx`  
The mobile hamburger menu button and cookie consent buttons lack `aria-label` attributes, hurting accessibility scores. Add proper labels.

## 5. Fix: `useConversationStateGuard` Duplicate Redirect Logic
**File:** `src/hooks/useConversationStateGuard.tsx`  
This hook duplicates the redirect logic already in `useAuthRedirect` (redirecting `/` to `/dashboard` when authenticated, and `/dashboard` to `/auth` when not). This can cause race conditions with double navigations. Remove the redundant redirect logic and keep only the conversation state save/restore functionality.

---

## Implementation Steps

1. **Restyle NotFound page** — use theme colors, add logo and "back to dashboard" link
2. **Reduce logging noise** — replace `console.log`/`console.warn` with `logger.debug` in ProtectedRoute and ConversationStateGuard
3. **Add lazy loading** — `loading="lazy"` on below-fold images, `fetchpriority="high"` on hero
4. **Add aria-labels** — hamburger menu button, cookie consent buttons
5. **Remove duplicate redirects** — strip redirect logic from `useConversationStateGuard`, keep only state persistence

