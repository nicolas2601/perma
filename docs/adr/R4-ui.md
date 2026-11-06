# ADR R4: UI component sources and accessibility baseline

Status: proposed (research squad R4, UI/a11y lane)
Scope: component sources for the PERMA mobile PWA (390 px screens, Tailwind 4, React 19).

## Decision

Use the Radix primitives already installed for behavior (Dialog, Accordion, Tabs). Style them with the project tokens in `src/styles/tokens.css` and with Motion, which is already a dependency. Do not adopt HeroUI v3 or add shadcn/ui or 21st.dev components for this release. Build the remaining pieces (glass nav, badge, button, file input, image zoom, live region) as small local components.

## Evidence

### Installed baseline (HECHO)
- `package.json`: `@radix-ui/react-accordion ^1.3.1`, `@radix-ui/react-dialog ^1.3.1`, `@radix-ui/react-tabs ^1.2.1`, `motion ^14.9.1`, `tailwindcss ^4.3.4`, `react ^19.3.1`.
- `npm view`: `@radix-ui/react-dialog` latest 1.3.1, `react-accordion` latest 1.3.1, `react-tabs` latest 1.2.1. The installed ranges match the latest published versions.

### HeroUI v3 (HECHO, verified)
- `npm view @heroui/react@3.2.7`: peers are `react >=19`, `tailwindcss >=4`, `react-aria ^3.53.1`, `react-aria-components ^1.22.1`, `@react-aria/ssr`, `@react-aria/utils`, `@internationalized/date`. It also depends on `@heroui/styles 3.2.7`, `tailwind-variants`, `input-otp`, and `@radix-ui/react-avatar`. `sideEffects: false`.
- Context7 (`/llmstxt/heroui_react_llms_txt`): the setup is `@import "tailwindcss";` followed by `@import "@heroui/styles";`. No Provider is required. Drawer has focus trap, ESC close, scroll lock, and drag to dismiss. Accordion supports `variant`, `hideSeparator`, and `isDisabled`.
- Bundle, measured in a scratch dir outside the repo (esbuild 0.25, minified, production, react and react-dom externalized):
  - `Button` alone: 27.4 KB gzip.
  - `Button + Tabs + Accordion + Modal + Drawer`: 67.4 KB gzip.
  - Radix `Dialog + Accordion + Tabs`: 25.2 KB gzip.
  - Note: both numbers are shared-runtime-inclusive. React Aria is the bulk of the HeroUI cost.
- Budget: the initial JS limit is 170 KB gzip. HeroUI would take roughly 40% of it if it lands in the initial bundle. It could be lazy-loaded, but the savings do not justify a second styling system.

### shadcn/ui (PARTIAL)
- `mcp__shadcn__get_project_registries` returned no configured registries. There is no `components.json`, so `search_items_in_registries` for `@shadcn` returned nothing. I did not run `init`. Current shadcn output is Radix-based, so it adds no new primitive family.
- Tailwind 4 setup: not verified in this run. Treat as unverified until checked with `shadcn` docs.

### 21st.dev (NOT VERIFIED)
- `21st usage --json` returned HTTP 503, so `freeRetrievalsRemaining` is unknown. Per the brief, I made no `get`. `21st search "bottom sheet drawer mobile" --type c --free --limit 5 --json` also returned HTTP 503, so there are no candidates. No generate, iterate, take, or Magic MCP was used.

## Per-need recommendation

Each row gives one source, the reason, bundle impact, and accessibility notes.

| PERMA need | Source | Reason | Bundle impact | A11y notes |
|---|---|---|---|---|
| Bottom sheet / drawer (ABCDE, Info) | Radix Dialog, styled as a sheet | Already installed. Gives focus trap, Escape, and focus return. Lets us own the spring and origin motion the brief requires (transform and opacity only) | 0 KB new (already in the 25.2 KB Radix set) | Escape closes. Focus returns to trigger via `onCloseAutoFocus`. Title with `Dialog.Title`. Background is inert and scroll is locked via `react-remove-scroll` (a Radix dependency) |
| Accordion sheet ABCDE (5 criteria, 17 options) | Radix Accordion | Already installed. Keeps open or closed state per item, which satisfies "close and reopen keeps everything". Height transition via `data-state` | 0 KB new | Each trigger is a `button` inside an `h3` with `aria-expanded`. Trigger min-height 44 px. Values visible when collapsed are rendered in the trigger text |
| Tabs (Imagen / Salida / Observaciones) | Radix Tabs | Already installed. Roving tabindex, Arrow keys, `aria-selected` | 0 KB new | Tab list gets `aria-label`. Triggers 44 px tall. Panels keep the image unmodified |
| Floating glass nav (Escritorio, Examinar, Revisión, Guía) | Local Tailwind component | No library needed. `backdrop-filter` plus tokens. Uses `env(safe-area-inset-bottom)` | 0 KB | `nav` with `aria-label`. `aria-current="page"` on the active link. Links 44 px |
| Segmented control (Ajustar / Ampliar / Capas / Info) | Radix Tabs styled as segments | Avoids a new package. Note: Radix ToggleGroup is the more semantically exact choice, but it is not installed and was not measured | 0 KB (Tabs) | Same keyboard model as Tabs. Crossfade 100 ms per brief |
| Toast / status messages | Local `aria-live` region | No Sonner or Radix Toast in the allowed list. A single `role="status"` region is enough for export and recovery messages | ~0 KB | `aria-live="polite"` for success. `aria-live="assertive"` only for recovery errors. Never claim a download that did not happen |
| Modal dialog (consent gate, export confirmation) | Radix Dialog | Same as the drawer. Center variant | 0 KB | Same as drawer. Destructive confirms focus the safe action first |
| File input (source, sample file) | Native `input type="file"` with a styled label | Native is the most reliable on mobile, including camera capture. No library | 0 KB | Visually hidden input, but the label is a 44 px button. `accept` set. Keyboard focus visible (2 px outline, 2 px offset) |
| Image zoom viewer (Ajustar / Ampliar, inertia) | Local component on transform | Motion is only transform and opacity. Pointer events plus Motion for inertia | 0 KB new | Zoom buttons have `aria-label` and 44 px targets. Pinch is supplementary; the buttons are the accessible path. Reduced motion: 100 ms crossfade, no inertia |
| Badge ("Modelo simulado", phase tags) | Local Tailwind `span` | Trivial. No library | 0 KB | Text is not color only. Contrast checked against tokens (not yet measured) |
| Button | Local Tailwind component on tokens | Avoids a second style system next to Figma tokens. Press scale(0.97) 120-160 ms is custom anyway. HeroUI Button costs 27 KB gzip plus React Aria | 0 KB new | 44 px minimum. Focus-visible ring 2 px offset 2 px. Disabled uses `aria-disabled` plus the visual state |

## Accessibility baseline (all components)
- Focus: 2 px outline, 2 px offset, visible on `:focus-visible` only.
- Targets: at least 44 px in both dimensions for every control, including tabs and accordion triggers.
- Escape: closes any Dialog and returns focus to the element that opened it. Verify with a test, because this is the most common regression.
- Live regions: one shared polite region. Errors use assertive only for the eight recovery scenarios.
- Motion: `prefers-reduced-motion` gives a 100 ms crossfade. Only transform and opacity animate.
- Language: ES default, EN available. Labels in both languages come from the same key set.

## Install and import commands

Repo uses pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) and also has `package-lock.json`. Pick one before adding dependencies. The recommended path adds nothing.

Radix (already installed, no install needed):
```bash
# Already present: @radix-ui/react-accordion ^1.3.1, react-dialog ^1.3.1, react-tabs ^1.2.1
```
```ts
import * as Dialog from '@radix-ui/react-dialog';
import * as Accordion from '@radix-ui/react-accordion';
import * as Tabs from '@radix-ui/react-tabs';
```

HeroUI v3 (not recommended; only if this decision is reversed):
```bash
pnpm add @heroui/react@3.2.7 @heroui/styles@3.2.7 react-aria-components@^1.22.1 react-aria@^3.53.1 @react-aria/ssr@^3.10.1 @react-aria/utils@^3.34.1 @internationalized/date@^3.12.4
```
```css
/* src/styles/tokens.css or the entry CSS: tailwindcss must come first */
@import "tailwindcss";
@import "@heroui/styles";
```
```ts
import { Button, Tabs, Accordion, Modal, Drawer } from '@heroui/react';
```

shadcn/ui (unverified CLI; only if chosen later):
```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add sheet
```

21st.dev: not used. Re-check with `21st usage --json` once the 503 clears, then run `21st search ... --free` before any `get`.

## Tradeoffs
- Radix plus local components: smallest bundle, aligns with Figma tokens and Motion. Costs: we own more styling and Escape/focus testing for each dialog.
- HeroUI: faster to build and polished defaults. Costs: about 67 KB gzip for five components, React Aria dependency, a second theme layer to reconcile with Geist and the tokens, and less control over the motion rules.
- shadcn: copy-paste ownership and Radix underneath. Costs: setup not done, and no new primitive family, so the benefit is small.

## Pre-mortem
- Radix Dialog with a custom sheet can break Escape-return-focus if the trigger unmounts. Mitigation: keep the trigger mounted and test it.
- Two lockfiles (pnpm and npm) can drift. Resolve before adding deps.
- The bundle numbers are esbuild with React externalized and no tree-shaking config from Vite. Re-measure in the real Vite build before a budget decision.

## Open items
- 21st.dev quota and search: retry when the service recovers.
- shadcn Tailwind 4 setup: verify before use.
- Real Vite bundle measurement with Radix in place.
