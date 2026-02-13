
## Fix Mobile View Issues on Homepage

### Problems Found

1. **Chat + Health Insights sidebar overlap on mobile**: The `ChatInterface` component renders a fixed `w-80` (320px) Health Insights sidebar next to the chat area. On a 375px mobile screen, this leaves only ~55px for the actual chat -- making it look broken and unreadable.

2. **ConversationSidebar also fixed at `w-80`**: When authenticated, the `ChatGPTInterface` wrapper renders another `w-80` sidebar. Combined with the Health Insights sidebar, this means two 320px sidebars compete for space on mobile.

3. **Features CTA section not mobile-friendly**: The "Ready to Transform..." section has a horizontal row of three items (`flex items-center justify-center space-x-6`) that can wrap awkwardly on small screens.

### Plan

**1. Hide Health Insights sidebar on mobile in ChatInterface**

In `src/components/chat/ChatGPTInterface.tsx`:
- Add `useIsMobile` hook import
- Wrap the Health Insights sidebar (`w-80 border-l` div at ~line 1094) with a `hidden md:block` class so it only shows on tablet/desktop
- This is the primary fix for the "weird" layout

**2. Hide ConversationSidebar on mobile in ChatGPTInterface wrapper**

In `src/components/chat/ChatGPTInterface.tsx`:
- Add `hidden md:flex` to the `ConversationSidebar` wrapper in the exported component (~line 1143), or wrap it conditionally with `useIsMobile`
- The Index.tsx mobile section already has its own conditional sidebar logic via `showHistory`, but the inner `ChatGPTInterface` still renders one unconditionally

**3. Fix Features CTA mobile layout**

In `src/components/LandingPageComponents.tsx`:
- Change the CTA benefits row (~line 204) from `flex items-center justify-center space-x-6` to `flex flex-col sm:flex-row items-center justify-center gap-3 sm:space-x-6` so items stack on mobile

### Technical Details

Files to modify:
- `src/components/chat/ChatGPTInterface.tsx` -- Hide health insights sidebar and conversation sidebar on mobile (2 changes)
- `src/components/LandingPageComponents.tsx` -- Fix CTA benefits row wrapping (1 change)
