---
name: CVRN
description: The league's permanent record — dense, square-cornered, broadcast-serious.
colors:
  action-blue: "#3B82F6"
  action-blue-ink: "#FFFFFF"
  location-yellow: "#FACC15"
  location-yellow-ink: "#0F0F10"
  destructive-red: "#EF4444"
  page-light: "#FAFAFA"
  page-dark: "#0E0E10"
  surface-light: "#FFFFFF"
  surface-dark: "#161618"
  ink-light: "#0F0F10"
  ink-dark: "#F4F4F5"
  recessed-light: "#F4F4F5"
  recessed-dark: "#27272A"
  quiet-ink-light: "#71717A"
  quiet-ink-dark: "#A1A1AA"
  rule-light: "#E4E4E7"
  rule-dark: "#27272A"
typography:
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 2rem
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.75rem
    letterSpacing: "-0.025em"
  subtitle:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.75rem
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25rem
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: "0.05em"
  data:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1rem
    fontFeature: "tabular-nums"
rounded:
  sm: "0px"
  md: "2px"
  lg: "4px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "18": "72px"
  "88": "352px"
components:
  panel:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.sm}"
    padding: "16px"
  panel-interactive:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.sm}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.action-blue-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "#4A8BF7"
  button-outline:
    backgroundColor: "{colors.page-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input:
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  nav-item:
    textColor: "{colors.ink-light}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
  nav-item-active:
    backgroundColor: "{colors.location-yellow}"
    textColor: "{colors.location-yellow-ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
  badge-default:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.action-blue-ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-outline:
    textColor: "{colors.ink-light}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  table-head:
    textColor: "{colors.quiet-ink-light}"
    typography: "{typography.label}"
    padding: "12px 16px"
  table-cell:
    textColor: "{colors.ink-light}"
    typography: "{typography.body}"
    padding: "12px 16px"
---

# Design System: CVRN

## 1. Overview

**Creative North Star: "The Record Desk"**

A press box desk with the league's record book open on it. Everything on that desk earns its place by being consulted: the standings, the box score, the schedule, the archive of past seasons. Nothing is there to set a mood. The record book is authoritative because it is complete and because it is the same every time you open it — and the desk is fast because whoever works at it is looking things up while play continues.

That fusion is the whole system. From the record book: squared corners, ruled lines, tabular figures, an archive that never loses a season. From the press box: density, speed, no ceremony between a question and its answer. The visual language is a broadcast stats graphic rendered for reading rather than for air — dense, ruled, unmistakably legible, and confident enough to present a Roblox volleyball league with the gravity of a real one.

What this system rejects is decoration standing in for authority. It does not use gradients to make a heading feel important, or shadows to make a card feel modern, or neon to make a competition feel exciting. Weight, rule lines, and tabular alignment carry all of it. If a surface needs an effect to read as serious, the surface is wrong.

**Key Characteristics:**
- Square corners on every data surface — `.panel` resolves to a literal `0px` radius
- Flat by default; borders and tonal fills carry all in-page depth
- One type family (Geist) for everything except numbers, which are always monospaced
- Two accents with fixed jobs: blue acts, yellow locates
- Dense by design — 12px vertical cell padding, `0.875rem` body, `0.75rem` labels
- Desktop-first; density expands upward rather than collapsing downward

## 2. Colors

A near-achromatic zinc field with exactly two accents, each carrying one job and no decorative use whatsoever.

### Primary
- **Action Blue** (`#3B82F6`, `hsl(217 91% 60%)`): Every actionable and stateful thing. Primary buttons, links, focus rings, the active sort column in a stat table, status dots, the top-loading progress bar. If it can be clicked or it reports live state, it is this blue. Identical in light and dark — the one token that does not shift between themes.

### Secondary
- **Location Yellow** (`#FACC15`, `hsl(48 96% 53%)`): Position, not action. Its only structural use is the active navigation item, where it sits behind near-black text. This is the system's single most distinctive decision and it must not erode: yellow answers "where am I," never "what can I do."

### Tertiary
- **Destructive Red** (`#EF4444`, `hsl(0 84% 60%)`): Irreversible actions and error surfaces only. Voiding a match, deleting a team, a failed sync row. Never a warning, never an accent.

### Neutral
- **Page** (`#FAFAFA` light / `#0E0E10` dark): The body field. Deliberately not pure white and not pure black.
- **Surface** (`#FFFFFF` light / `#161618` dark): Panels and elevated content sitting on the page field. The step between page and surface is the primary depth mechanism in this system.
- **Recessed** (`#F4F4F5` light / `#27272A` dark): Table header bands, hover fills (used at `/30` opacity), zebra striping (`/20`), disabled fills. The layer *below* the surface.
- **Ink** (`#0F0F10` light / `#F4F4F5` dark): All primary text and data values.
- **Quiet Ink** (`#71717A` light / `#A1A1AA` dark): Column labels, metadata, secondary values, placeholder text. Never body copy at small sizes.
- **Rule** (`#E4E4E7` light / `#27272A` dark): Every border, divider, and table line. Frequently used at `/30` opacity for internal column groupings inside dense tables.

### Named Rules

**The Two-Signal Rule.** Blue means *act*. Yellow means *you are here*. A screen that uses either color for any third purpose has broken the system, and the failure is invisible until a user misreads a highlighted row as a button.

**The No-Third-Accent Rule.** Anything that is not an action, a location, or a destructive operation is drawn from the neutral ramp. New categorical colors are prohibited. If a data category needs distinguishing, use position, weight, or rule lines before reaching for hue.

**The Inherited-Default Rule.** The current palette is Tailwind's stock zinc ramp with blue-500, yellow-400, and red-500 accents. That is a stated fact, not an endorsement. Any deliberate move away from it must change *all* of the accents together — a single re-tinted primary against stock zinc neutrals reads as a half-finished theme, which is worse than the default.

## 3. Typography

**Body Font:** Geist (with `ui-sans-serif`, `system-ui`, sans-serif fallback), loaded via `next/font` with `display: swap`
**Label/Mono Font:** the platform monospace stack (`ui-monospace`, `SFMono-Regular`, `Menlo`)

**Character:** One neutral geometric sans doing every job, with the monospace stack reserved exclusively for figures. The pairing has no personality contrast by design — the type is a delivery mechanism for data, and the visual interest lives in alignment and rule lines rather than in letterforms. There is no display face and no fluid sizing anywhere in the system.

### Hierarchy
- **Headline** (600, `1.5rem` / 24px, `-0.025em` tracking): Page titles. The largest type in the entire product; there is nothing above it.
- **Title** (600, `1.25rem` / 20px, `-0.025em`): Section headings within a page.
- **Subtitle** (500, `1.125rem` / 18px): Sub-section headings and panel titles.
- **Body** (400, `0.875rem` / 14px, `1.25rem` line-height): The workhorse. Table cells, form values, descriptions, nav items. Prose caps at 65–75ch; tabular content runs as wide as the data requires.
- **Label** (600, `0.75rem` / 12px, `0.05em` tracking, uppercase): Column headers, stat labels, metadata keys. Always in Quiet Ink.
- **Data** (400, `0.75rem` / 12px, monospace, `tabular-nums`): Every numeric value that sits in a column.

### Named Rules

**The One Family Rule.** Geist carries headings, buttons, labels, body, and navigation. The monospace stack is the only second face, and it appears only on numbers. Introducing a display face — a serif for headings, a condensed sans for scores — is prohibited; it is the fastest available route to the esports look this brand rejects.

**The Tabular Figures Rule.** Any number that appears in a column gets `font-mono tabular-nums`. Non-negotiable. Proportional digits in a stat table cause the column to shimmer as values change and destroy the scannability that justifies the density in the first place.

**The Fixed Scale Rule.** No `clamp()`, no viewport-relative type, anywhere. Users read this at a consistent desktop DPI, and a heading that shrinks inside a three-column shell looks broken rather than responsive.

**The Small-Type Floor.** `0.75rem` is the floor for any text a user must read, and text at that size must sit in Ink or Quiet Ink on Surface — never Quiet Ink at reduced opacity. Below 12px, stat tables stop being dense and start being unreadable, which is the difference between this system and the spreadsheet it replaces.

## 4. Elevation

This system is flat. In-page depth is built entirely from two mechanisms: a **tonal step** (Page → Surface → Recessed) and a **rule line** (a 1px border in the Rule token). Across the entire application there are fewer than thirty shadow utilities, and that is the correct number. A panel sitting on the page is distinguished by being lighter than the page and by having a border — not by casting a shadow onto it.

Shadows exist for exactly two purposes: lifting genuinely floating layers (dialogs, dropdowns, popovers, tooltips, toasts) off the page, and confirming a hover on an interactive panel. Nothing at rest inside the page flow carries one.

The one deliberate exception is affordance. A panel that navigates somewhere must announce that at rest, because a user who has to hover to discover that a card is clickable will not discover it. That announcement is **structural** — a full-strength border where a static panel would use a lighter one, plus a small chevron in the trailing corner — and the shadow arrives only on hover, alongside a border shift to Action Blue and a 1px lift.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` — Tailwind `shadow-lg`): Dialogs, sheets, dropdown menus, popovers. The only shadow that appears at rest, and only on things that float.
- **Hover lift** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)` — Tailwind `shadow-sm`): Applied to interactive panels on `:hover` and `:focus-visible` only. Never at rest.

### Named Rules

**The Flat-Page Rule.** Nothing in the page flow casts a shadow at rest. If a surface needs to feel separated from what is behind it, change its tone or give it a border. A resting `shadow-sm` on a panel is the single clearest tell of an untouched component library.

**The Affordance-Before-Shadow Rule.** Clickability is announced structurally at rest — border weight and a chevron — and confirmed with motion and shadow on hover. Discovery must never depend on the user hovering first.

## 5. Components

### Panels

`.panel` is the canonical container of this system and the only one. It is the load-bearing surface for standings, box scores, match cards, stat blocks, media posts, and admin forms alike.

- **Corner Style:** Square. `rounded-sm` resolves to `calc(0.25rem - 4px)` = **`0px`**. This is intentional and it is the system's most recognizable trait. `rounded-md` (2px) and `rounded-lg` (4px) exist for controls; containers get none.
- **Background:** Surface (`#FFFFFF` / `#161618`) on the Page field.
- **Border:** 1px Rule token, always present. The border does the work the shadow would otherwise do.
- **Shadow Strategy:** None at rest. See Elevation.
- **Internal Padding:** `16px` standard, `24px` for full-page sections, `8px` for compact cards inside sidebars.

**Interactive panel.** Same shape, plus: a full-opacity border at rest (static panels may use `border-border/50`), a trailing chevron at `12px` in Quiet Ink, and on hover — border to Action Blue, `shadow-sm`, `-translate-y-px`, all at 150ms.

**Exception — full-bleed graphic panels.** The featured match card and its carousel take the border change on hover and nothing else: no `shadow-sm`, no `-translate-y-px`. Lifting a 376px graphic is a far heavier gesture than lifting a list row, and these surfaces already carry two persistent affordances a row does not — visible arrows and visible dots. This is the only sanctioned deviation; a panel that is mostly text still lifts.

### Buttons
- **Shape:** Barely-rounded (`rounded-md`, 2px). Height `36px` default, with `24px` / `32px` / `40px` steps and matching square icon sizes.
- **Primary:** Action Blue fill, white text, `8px 16px` padding. Hover drops to `90%` opacity.
- **Secondary:** Location Yellow fill with near-black text — **use sparingly.** In practice this variant collides with the yellow-means-location rule; prefer outline for secondary actions.
- **Outline / Ghost:** Transparent or Page-colored fill with a Rule border; hover fills with the accent tint.
- **Destructive:** Destructive Red fill, white text. Reserved for irreversible operations.
- **Focus:** `3px` ring in Action Blue at 50% opacity, plus a border shift to the ring color.

### Inputs / Fields
- **Style:** Transparent fill, 1px Rule border, `rounded-md` (2px), `36px` tall, `4px 12px` padding. Dark mode fills at `input/30`.
- **Focus:** `3px` Action Blue ring at 50% opacity with the border shifting to match. Transition on `color, box-shadow` only.
- **Error:** `aria-invalid` drives a Destructive Red border and a red ring at 20% (40% in dark).
- **Placeholder:** Quiet Ink. Never lighter.

### Badges
- **Shape:** Fully rounded (`rounded-full`) — the deliberate counterpoint to the square panels. `2px 8px` padding, `0.75rem` medium.
- **Variants:** default (Action Blue), secondary, destructive, warning (yellow-500 on black), outline, ghost, link.

### Tables

The signature surface of the product, and the one most worth protecting.

- **Header:** `0.75rem` uppercase semibold in Quiet Ink with `0.05em` tracking, on a Recessed band at `/30`, with a bottom Rule border.
- **Cells:** `0.875rem` body, `12px` vertical / `16px` horizontal padding (`8px` horizontal below `sm`), 1px bottom Rule border, dropped on the last row.
- **Row hover:** Recessed at `/30`. Zebra striping, where used, is Recessed at `/20`.
- **Numbers:** monospace, `tabular-nums`, centered. Text columns left-align; the leading identity column is sticky on wide tables.
- **Column grouping:** dense stat tables use a two-row header with a group band above the column labels, separated by Rule borders at `/30`.

### Navigation
- **Style:** Horizontal link row at `lg` and above, collapsing to a vertical stack in a sheet below it. Items are `36px` tall, `12px` horizontal padding, square (`rounded-sm` = 0), `0.875rem` medium.
- **Default:** Ink text, no fill. **Hover:** accent fill with accent-foreground text.
- **Active:** Location Yellow fill with near-black text. This is the system's you-are-here signal and it appears nowhere else.
- **Focus:** `2px` Action Blue ring.

### Page Containers
Three fixed widths, chosen by content density rather than by page type: `.page-narrow` (`max-w-7xl` / 1280px) for forms and reading, `.page-wide` (1440px) for the standard public shell, `.page-bleed` (1920px) for the widest stat tables. All use `16px` / `24px` / `32px` responsive gutters.

### Named Rules

**The Square-Corner Rule.** Data containers have zero radius. Controls get 2px. Badges get a pill. There is no fourth radius, and `rounded-xl` — shadcn's `<Card>` default — is prohibited on any new surface.

**The One Container Rule.** `.panel` is the only container vocabulary. shadcn's `<Card>` currently survives in seven files with `rounded-xl` and `shadow-sm`; those are deviations to migrate, not a second sanctioned system.

## 6. Do's and Don'ts

### Do:
- **Do** use `.panel` for every container: square corners, 1px Rule border, Surface background, no resting shadow.
- **Do** give clickable panels a full-strength border and a trailing chevron at rest, then add `shadow-sm`, an Action Blue border, and a 1px lift on hover.
- **Do** set `font-mono tabular-nums` on every number that sits in a column.
- **Do** keep Action Blue for what acts and Location Yellow for where you are. One job each.
- **Do** build depth from the Page → Surface → Recessed tonal step and 1px Rule borders.
- **Do** use fixed rem type sizes and let responsive behavior be structural — collapse the sidebar, stack the columns, make the table scroll.
- **Do** hold body text to Ink and metadata to Quiet Ink. `0.75rem` is the floor for anything a user must actually read.
- **Do** keep transitions at 150–250ms on `color`, `box-shadow`, `opacity`, and `transform` — and pair every one with a `prefers-reduced-motion` alternative.
- **Do** ship skeletons matching the real layout for loading, and empty states that name what will appear here and how it gets there.

### Don't:
- **Don't** use `background-clip: text` with a gradient. `app/(public)/home/HomePage.tsx:196` currently does this on the "Season Standings" heading. Gradient text is decorative, never meaningful — use weight and size.
- **Don't** use `border-left` or `border-right` above 1px as a colored accent stripe. `app/(public)/home/HomePage.tsx:186` currently does this on the empty state. Use a full border, a background tint, or nothing.
- **Don't** ship the **generic SaaS admin template**: untouched shadcn defaults, `rounded-2xl` containers, purple gradient cards, hero-metric tiles. `rounded-xl` on a container is this look arriving one class at a time.
- **Don't** ship the **hobby-project dashboard**: mismatched spacing, half-styled surfaces, default components dropped in unmodified. This is the failure mode CVRN exists to disprove.
- **Don't** reach for **esports and gaming tropes** — neon accents, angular clip-path panels, RGB glows, aggressive italics, condensed display faces on scores. The obvious reflex for a gaming league and the wrong one for this brand.
- **Don't** produce **a spreadsheet on the web**: an undifferentiated grid of numbers with no rank, no state, and no visual weight. Density is the point; density without hierarchy is the anti-reference.
- **Don't** put a resting shadow on anything in the page flow. If it does not float above the page, it does not cast a shadow.
- **Don't** introduce a second type family, a display face, or `clamp()`-sized headings.
- **Don't** introduce a third accent hue for categorical data. Use position, weight, and rule lines.
- **Don't** mix focus vocabularies. Controls use a `3px` ring at 50% opacity; navigation currently uses `2px` at full opacity. Converge on the `3px` treatment.
- **Don't** let a color be the only carrier of meaning. Win/loss, qualified/eliminated, and synced/failed each need a second cue — a glyph, a label, or position.

**Audit test:** if a screenshot of a new surface could be dropped into a shadcn starter template without looking out of place, it is wrong. The square corners, the yellow active-nav, the monospaced columns, and the total absence of resting shadows are what make a CVRN screen identifiable — and any one of them going missing is the system eroding.
