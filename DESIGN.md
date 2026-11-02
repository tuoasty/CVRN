---
name: CVRN
description: The league's permanent record — dense, square-cornered, broadcast-serious.
colors:
  action-blue: "#2D55E6"
  action-blue-light: "#1F46D1"
  action-blue-ink: "#FFFFFF"
  location-yellow: "#E8992C"
  location-yellow-ink: "#1A1206"
  destructive-red: "#EF4444"
  success-green-light: "#157F3C"
  success-green-dark: "#3ECC72"
  success-green-ink: "#FFFFFF"
  rarity-rare-light: "#2A62E5"
  rarity-rare-dark: "#5C96F5"
  rarity-epic-light: "#8739D0"
  rarity-epic-dark: "#B477EE"
  page-light: "#F4F4F4"
  page-dark: "#0A0A0A"
  surface-light: "#FFFFFF"
  surface-dark: "#141414"
  ink-light: "#1C1C1C"
  ink-dark: "#F5F5F5"
  recessed-light: "#EEEEEE"
  recessed-dark: "#1F1F1F"
  quiet-ink-light: "#5E5E5E"
  quiet-ink-dark: "#999999"
  rule-light: "#D9D9D9"
  rule-dark: "#2B2B2B"
typography:
  headline:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 2rem
    letterSpacing: "-0.025em"
  title:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.75rem
    letterSpacing: "-0.025em"
  subtitle:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.75rem
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25rem
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: "0.05em"
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
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
    textColor: "{colors.quiet-ink-light}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
  nav-item-active:
    textColor: "{colors.ink-light}"
    fontWeight: 600
    textDecoration: "underline 2px"
    underlineOffset: "6px"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
  filter-option:
    textColor: "{colors.quiet-ink-light}"
    typography: "{typography.body}"
    padding: "0 10px"
    height: "32px"
  filter-option-selected:
    textColor: "{colors.ink-light}"
    fontWeight: 600
    underline: "2px {colors.ink-light}, inset to the text"
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
- One type family (IBM Plex Sans) for everything except numbers, which use its sibling IBM Plex Mono
- One accent with one job: blue acts. Selected and you-are-here states are ink weight plus an ink underline, never a color
- Dense by design — 12px vertical cell padding, `0.875rem` body, `0.75rem` labels
- Desktop-first; density expands upward rather than collapsing downward

## 2. Colors

A true-neutral black/gray field (hue-agnostic, no tint) with cobalt and amber accents plus a green success token, each carrying one job and no decorative use whatsoever.

### Primary
- **Action Blue** (cobalt `#2D55E6` / `hsl(227 79% 54%)` dark, `#1F46D1` / `hsl(227 74% 47%)` light): Every actionable and stateful thing. Primary buttons, links, focus rings, the active sort column in a stat table, status dots, the top-loading progress bar. If it can be clicked or it reports live state, it is this cobalt.

### Secondary
- **Location Yellow** (broadcast amber `#E8992C`, `hsl(35 80% 54%)`): Reserved. It no longer has a structural use: the active navigation item and selected filters are marked by an ink underline (see Navigation and Filters). The token stays in the coordinated palette; new uses need a design decision first. Its sanctioned uses are the update-log rework glyph and the 5-star spec rating (the filled stars of a 5-star spec are amber; 4 and 3 stars take Epic and Rare, see Rarity).

### Tertiary
- **Destructive Red** (`#EF4444`, `hsl(0 84% 60%)`): Irreversible actions and error surfaces only. Voiding a match, deleting a team, a failed sync row. Never a warning, never an accent.

### Neutral
- **Page** (`#F4F4F4` light / `#0A0A0A` dark): The body field. Deliberately not pure white and not pure black. In light mode it sits a clear step below the white Surface so panels separate from the page and the white anchors the eye (2026-10-07: was `#FAFAFA`, which left page and panels reading as one glaring sheet).
- **Surface** (`#FFFFFF` light / `#141414` dark): Panels and elevated content sitting on the page field. The step between page and surface is the primary depth mechanism in this system.
- **Recessed** (`#EEEEEE` light / `#1F1F1F` dark): Table header bands, hover fills (used at `/30` opacity), zebra striping (`/20`), disabled fills. The layer *below* the surface.
- **Ink** (`#1C1C1C` light / `#F5F5F5` dark): All primary text and data values.
- **Quiet Ink** (`#5E5E5E` light / `#999999` dark): Column labels, metadata, secondary values, placeholder text. Never body copy at small sizes.
- **Rule** (`#D9D9D9` light / `#2B2B2B` dark): Every border, divider, and table line. Frequently used at `/30` opacity for internal column groupings inside dense tables.

### Rarity
- **Rare** (`--rarity-rare`: `#5C96F5` dark / `#2A62E5` light), **Epic** (`--rarity-epic`: `#B477EE` dark / `#8739D0` light), **Mythical** (`--rarity-mythic`: a seven-stop spectrum gradient, brighter in dark mode). Common is plain Ink.
- These are the game's own rarity tiers, not categorical colors. They appear only where the game's rarity is the thing being named: rarity headings on Abilities and Builds, rarity columns in the Builds pick tray, and the 4-star (Epic) and 3-star (Rare) spec ratings. Never on rows, values, or chrome.
- **Exception: Mythical gradient text.** `.text-rarity-mythic` clips the Mythical gradient to text. It is sanctioned for the word "Mythical" (and a Mythical rarity heading) only; it is the one place gradient text is allowed.

### Named Rules

**The Two-Signal Rule.** Blue means *act*. Ink means *selected* or *you are here*. A selected filter, tab or nav item is a state, not an action, so it is drawn as ink text at semibold weight with a 2px ink underline; cobalt is never a selected-state fill. A screen that uses blue for anything but actions, links and focus has broken the system, and the failure is invisible until a user misreads a highlighted row as a button.

**The No-Third-Accent Rule.** Anything that is not an action, a location, or a destructive operation is drawn from the neutral ramp. New categorical colors are prohibited. If a data category needs distinguishing, use position, weight, or rule lines before reaching for hue.

**The Coordinated-Palette Rule.** The palette is a deliberate move off the stock shadcn defaults: a true-neutral (hue-agnostic) black/gray ramp — not Tailwind zinc — under a cobalt action accent (`#2D55E6`), a broadcast-amber location accent (`#E8992C`), and a green success token (`#3ECC72` dark / `#157F3C` light) for win/synced state. The neutrals carry no hue tint. Any future accent change must move *all* of them together — a single re-tinted primary against the others reads as a half-finished theme.

**Exception: update-log change markers.** Inside an update log body, color marks the kind of change and nothing else: green ▲ buff (Success), red ▼ nerf (Destructive), a yellow `~` rework glyph (Location Yellow), and a plain-text `NEW` label in Action Blue (blue as state: "new in this version"). Each is a glyph or a single word, never a fill, and each is also carried by its shape or its word. Headings in update logs stay neutral; this exception does not extend to section, category, or feature titles.

## 3. Typography

**Body Font:** IBM Plex Sans (with `ui-sans-serif`, `system-ui`, sans-serif fallback), loaded via `next/font` with `display: swap`; `font-size-adjust: 0.54` on the body matches its x-height to the fixed rem scale
**Label/Mono Font:** IBM Plex Mono (with the platform monospace stack as fallback) — the matched sibling to Plex Sans

**Character:** One neutral geometric sans doing every job, with the monospace stack reserved exclusively for figures. The pairing has no personality contrast by design — the type is a delivery mechanism for data, and the visual interest lives in alignment and rule lines rather than in letterforms. There is no display face and no fluid sizing anywhere in the system.

### Hierarchy
- **Headline** (600, `1.5rem` / 24px, `-0.025em` tracking): Page titles. The largest type in the entire product; there is nothing above it.
- **Title** (600, `1.25rem` / 20px, `-0.025em`): Section headings within a page.
- **Subtitle** (500, `1.125rem` / 18px): Sub-section headings and panel titles.
- **Body** (400, `0.875rem` / 14px, `1.25rem` line-height): The workhorse. Table cells, form values, descriptions, nav items. Prose caps at 65–75ch; tabular content runs as wide as the data requires.
- **Label** (600, `0.75rem` / 12px, `0.05em` tracking, uppercase): Column headers, stat labels, metadata keys. Always in Quiet Ink.
- **Data** (400, `0.75rem` / 12px, monospace, `tabular-nums`): Every numeric value that sits in a column.

### Named Rules

**The One Family Rule.** IBM Plex Sans carries headings, buttons, labels, body, and navigation; its matched sibling IBM Plex Mono is the only second face, and it appears only on numbers. `font-size-adjust: 0.54` on the body compensates for Plex's smaller x-height so apparent sizes match the fixed rem scale. Introducing a third face — a serif for headings, a condensed sans for scores — is prohibited; it is the fastest available route to the esports look this brand rejects.

**The Tabular Figures Rule.** Any number that appears in a column gets `font-mono tabular-nums`. Non-negotiable. Proportional digits in a stat table cause the column to shimmer as values change and destroy the scannability that justifies the density in the first place.

**The Fixed Scale Rule.** No `clamp()`, no viewport-relative type, anywhere. Users read this at a consistent desktop DPI, and a heading that shrinks inside a three-column shell looks broken rather than responsive.

**The Small-Type Floor.** `0.75rem` is the floor for any text a user must read, and text at that size must sit in Ink or Quiet Ink on Surface — never Quiet Ink at reduced opacity. Below 12px, stat tables stop being dense and start being unreadable, which is the difference between this system and the spreadsheet it replaces.

**Exception: update-log sections.** In an update log body, `#` sections are `2.25rem` (36px) semibold with `-0.03em` tracking, larger than the page's own 24px version title. A patch note is read by section, so sections carry the weight and the version header acts as a label. Below them, `##` categories are Label style (12px uppercase, Quiet Ink) acting as helpers, and `###` features are `1.125rem` semibold Ink. This is the only type step above Headline in the product.

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
- **Background:** Surface (`#FFFFFF` / `#141414`) on the Page field.
- **Border:** 1px Rule token, always present. The border does the work the shadow would otherwise do.
- **Shadow Strategy:** None at rest. See Elevation.
- **Internal Padding:** `16px` standard, `24px` for full-page sections, `8px` for compact cards inside sidebars.

**Interactive panel.** Same shape, plus: a full-opacity border at rest (static panels may use `border-border/50`), a trailing chevron at `12px` in Quiet Ink, and on hover — border to Action Blue, `shadow-sm`, `-translate-y-px`, all at 150ms.

**Exception — full-bleed graphic panels.** The featured match card and its carousel take the border change on hover and nothing else: no `shadow-sm`, no `-translate-y-px`. Lifting a 376px graphic is a far heavier gesture than lifting a list row, and these surfaces already carry two persistent affordances a row does not — visible arrows and visible dots. This is the only sanctioned deviation; a panel that is mostly text still lifts.

### Buttons
- **Shape:** Barely-rounded (`rounded-md`, 2px). Height `36px` default, with `24px` / `32px` / `40px` steps and matching square icon sizes.
- **Primary:** Action Blue fill, white text, `8px 16px` padding. Hover drops to `90%` opacity.
- **Secondary:** Location Yellow fill with near-black text. Amber is reserved (see Colors); prefer outline for secondary actions.
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

### Ruled Sections

The pattern for grouping list content without a container: a heading, a 1px Rule-tone line under it, the rows, and whitespace before the next section. Used by the Records category blocks. It is not a container (no fill, no surrounding border), so it coexists with the One Container Rule; reach for it when a `.panel` per item would box every list into a card.

- **Heading:** 14px semibold Ink, `8px` below it, then the Rule line. Never an Ink rule: a full-strength line reads as a white bar in dark mode.
- **Rows:** separated by Rule lines (`/60` for secondary rows), the last row without one.
- **Spacing between sections:** 44px vertical, 48px horizontal in a grid.

### Filters

Shared components live in `app/components/filters/`.

- **Selected filter state:** Ink text, semibold, plus a 2px Ink underline inset to the text. Unselected options are Quiet Ink medium and go to Ink on hover. No fill, no box, no cobalt.
- **Option rows (`OptionRow`):** a 12px semibold Quiet Ink label followed by plain-text options. "All" comes first, separated from specific values by a 1px Rule divider. Numbers (season numbers) are mono. Multi-select rows mark every selected value; "All" clears them.
- **View tabs (`ViewTabs`):** page-level tabs on a full-width Rule line; the selected tab carries a 2px Ink bottom border over that line. Page tools sit at the right end of the same line and drop to their own row beneath it when space runs out. `StatViewSelector` uses the same tabs with the rule fitted to the tabs' width.
- **Inline switch (`InlineSwitch`):** two or three text options separated by a Rule-tone `/`, the selected one underlined.
- **Wording editor (admin Information):** editors only appear when an ability shows its DERIVED description; ORIGINAL shows the game text alone. Each line is collapsed to its sentence (chevron, plus a Secondary dot when a part is unverified or unhandled; no toggle there, verification is set on the Terms tab). Expanding shows the raw game line in mono and one row per component (effect, each option, or param): tag on the left, labelled plain inputs for Label, Unit, Label description, Grants, and an `InlineSwitch` for the number format. Each expanded line has its own Save; when the change reaches other abilities, Save first reveals the notes (old line struck through in Quiet Ink, new in Ink) with a confirm. No boxes, no sticky bars.

### Information area

Public reference pages for the game's own data (`/information/*`). They follow the system with a few sanctioned patterns of their own.

- **Segment picker:** ABILITIES / BUILDS / UPDATES / SPECS. At 640px and up, a centered line of 14px medium uppercase text separated by Rule-tone `/`; the current segment is Ink semibold with a 2px Ink underline. Below 640px, a 2 + 2 tonal strip on Recessed `/45`; the current segment takes the Page fill with an inset 2px Ink bottom line. It is the page's only header.
- **Whitespace-only rarity lists (Abilities, Builds):** no row rules, no boxes. Groups are headed by the rarity name in its rarity token (Abilities add Normal / Lucky odds in mono; Builds show none), 44px between groups. Row hover and the open row are Recessed `/30`. A row that has more to show carries a 12px medium Quiet "See more" / "See less" at its end instead of a chevron; opening animates height over 200ms (`grid-template-rows` 0fr to 1fr), instant under reduced motion. One open row at a time, kept in the URL.
- **Inspector:** ability details shown in three containers with the same content. A floating card on hover-capable desktops (Surface, 1px Rule, Overlay shadow, square, 150ms fade plus 4px rise, 200ms open delay, triggered by a dotted-underline name); a bottom Sheet on touch or below 768px; and docked beside the kit names on the spec page, where clicking a name switches it (no hover preview).
- **Row-fill bar (Heights):** a Recessed fill behind the whole row, its width the row's weight over the top weight, with height, game value and odds sitting on it. Hover steps the fill to the Rule tone and the odds to Ink. It is the only bar in the row and the only place this pattern is used. Dropped on phone.
- **Labelled slot filters with an in-page tray (Builds):** 190px slots on Recessed `/45`, Label on top, value "Any" in Quiet Ink or the pick in Ink semibold with an `×` to clear. Clicking a slot turns it into the input (Recessed `/90`, inset 2px Ink bottom line, ghost completion in Quiet Ink, Tab completes). Options open in the page under the slots, never in a floating box: rarity columns (or foot columns for heights) of Quiet names that go to Ink on Recessed `/90` when hovered or active, and a 12px "Close" at the top right. Typing hides non-matches in place. Phone stacks the slots full width, label left, value right.
- **Spec photos:** real player photos at 4:5 everywhere, cropped at `object-position: 50% 20%` so heads survive. Gallery cards carry a lower third: a black gradient over the bottom 40% of the photo with the name in white, and stars plus height on a fixed bottom row. The gradient exists for legibility over arbitrary photos, not to decorate; it is sanctioned on spec photos only.

### Navigation
- **Style:** Horizontal link row at `lg` and above, collapsing to a vertical stack in a sheet below it. Items are `36px` tall, `12px` horizontal padding, square (`rounded-sm` = 0), `0.875rem` medium.
- **Default:** Quiet Ink text, no fill. **Hover:** Ink text with a Quiet Ink 2px underline.
- **Active:** Ink text, semibold, with a 2px Ink underline at a 6px offset. This is the you-are-here signal.
- **Grouped items (Information):** a click-to-open anchored panel, 320px wide, square, Surface fill, 1px Rule border with no top border so it attaches flush to the header's bottom edge, Overlay shadow, 12px padding. A Label-style group name, then one row per child (14px semibold title). Hover and the current page get a Recessed fill; the current page carries a right-aligned "Here". Opens with opacity plus a 4px rise over 200ms, instant under reduced motion.
- **Grouped items (admin strip):** the admin navbar is one 52px row. Clicking a group name opens a full-width strip directly under the header, drawn over the page so the page never moves: 44px tall, Surface fill, 1px bottom Rule, Overlay shadow, square, items aligned to the page gutter, sticky with the header. Clicking another group swaps the strip's contents in place; clicking the open group closes it. It also closes on navigation (including clicking the current page), on Escape, and on a click outside. Opening is click only, never hover. It opens with opacity plus a 4px rise over 200ms, instant under reduced motion. A group name is underlined when the current page is inside it or its strip is open; the current page is underlined inside the strip. The current page is the longest nav route that prefixes the pathname. Below `lg`, the sheet lists pages under Label-style group names. Roles that can see 3 pages or fewer get flat links with no groups.
- **Region / season picker (tonal step):** the trigger separates region from season by tone, not color: the region code in mono semibold 12px on Recessed, a 1px Rule hairline, the season name on Page. The popover keeps a fixed width and labeled structure: boxed region buttons with the selected one filled in Quiet Ink (light text on it), and the current season on a Recessed fill with a Rule border. No cobalt. In admin, it renders only on pages that read it: Matches, Media, Match Stats, Standings, Playoffs, Articles, Spec Calibration.
- **Focus:** `2px` Action Blue ring on nav items (converging on the `3px` control ring; see Don'ts).

### Page Containers
Three fixed widths, chosen by content density rather than by page type: `.page-narrow` (`max-w-7xl` / 1280px) for forms and reading, `.page-wide` (1440px) for the standard public shell, `.page-bleed` (1920px) for the widest stat tables. All use `16px` / `24px` / `32px` responsive gutters.

### Named Rules

**The Square-Corner Rule.** Data containers have zero radius. Controls get 2px. Badges get a pill. There is no fourth radius, and `rounded-xl` — shadcn's `<Card>` default — is prohibited on any new surface.

**The One Container Rule.** `.panel` is the only container vocabulary. shadcn's `<Card>` currently survives in seven files with `rounded-xl` and `shadow-sm`; those are deviations to migrate, not a second sanctioned system.

**The Inline-Over-Dropdown Rule.** When every option fits on one line (regions, seasons, positions, stat views), render them inline as an option row or view tabs. A popover is reserved for controls that cannot be inline (a date calendar) and for global context (the navbar region/season picker). A dropdown that hides four choices behind a click is a spreadsheet filter, not a record desk.

## 6. Do's and Don'ts

### Do:
- **Do** use `.panel` for every container: square corners, 1px Rule border, Surface background, no resting shadow.
- **Do** give clickable panels a full-strength border and a trailing chevron at rest, then add `shadow-sm`, an Action Blue border, and a 1px lift on hover.
- **Do** set `font-mono tabular-nums` on every number that sits in a column.
- **Do** keep Action Blue for what acts, and mark what is selected or where you are with ink weight and an ink underline.
- **Do** build depth from the Page → Surface → Recessed tonal step and 1px Rule borders.
- **Do** use fixed rem type sizes and let responsive behavior be structural — collapse the sidebar, stack the columns, make the table scroll.
- **Do** hold body text to Ink and metadata to Quiet Ink. `0.75rem` is the floor for anything a user must actually read.
- **Do** keep transitions at 150–250ms on `color`, `box-shadow`, `opacity`, and `transform` — and pair every one with a `prefers-reduced-motion` alternative.
- **Do** ship skeletons matching the real layout for loading, and empty states that name what will appear here and how it gets there — as centered Quiet Ink text in the space the content would fill, never boxed.

### Don't:
- **Don't** use `background-clip: text` with a gradient. Gradient text is decorative, never meaningful; use weight and size. The one sanctioned exception is the Mythical rarity name (see Rarity).
- **Don't** use `border-left` or `border-right` above 1px as a colored accent stripe. Use a full border, a background tint, or nothing.
- **Don't** wrap an empty, zero, loading-failed, or not-found message in a `.panel` or any bordered box. A box with one line of gray text in it is a gratuitous container — it draws a frame around nothing. Render the message as centered Quiet Ink text in the region the real content would occupy (e.g. `flex items-center justify-center` at the grid's min-height). A box earns its border only when it holds structured content.
- **Don't** ship the **generic SaaS admin template**: untouched shadcn defaults, `rounded-2xl` containers, purple gradient cards, hero-metric tiles. `rounded-xl` on a container is this look arriving one class at a time.
- **Don't** ship the **hobby-project dashboard**: mismatched spacing, half-styled surfaces, default components dropped in unmodified. This is the failure mode CVRN exists to disprove.
- **Don't** reach for **esports and gaming tropes** — neon accents, angular clip-path panels, RGB glows, aggressive italics, condensed display faces on scores. The obvious reflex for a gaming league and the wrong one for this brand.
- **Don't** produce **a spreadsheet on the web**: an undifferentiated grid of numbers with no rank, no state, and no visual weight. Density is the point; density without hierarchy is the anti-reference.
- **Don't** put a resting shadow on anything in the page flow. If it does not float above the page, it does not cast a shadow.
- **Don't** introduce a second type family, a display face, or `clamp()`-sized headings.
- **Don't** introduce a third accent hue for categorical data. Use position, weight, and rule lines.
- **Don't** mix focus vocabularies. Controls use a `3px` ring at 50% opacity; navigation currently uses `2px` at full opacity. Converge on the `3px` treatment.
- **Don't** let a color be the only carrier of meaning. Win/loss, qualified/eliminated, and synced/failed each need a second cue — a glyph, a label, or position.

**Audit test:** if a screenshot of a new surface could be dropped into a shadcn starter template without looking out of place, it is wrong. The square corners, the ink-underlined active state, the monospaced columns, and the total absence of resting shadows are what make a CVRN screen identifiable — and any one of them going missing is the system eroding.
