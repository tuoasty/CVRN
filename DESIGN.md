---
name: CVRN
description: The league's permanent record, with a game layer. Dense, black and white, ball-yellow on match day.
dials:
  landing: "ENERGY 3 / RHYTHM 3 / MOTION 2"
  reworked: "ENERGY 2 / RHYTHM 2 / MOTION 1"
  record: "ENERGY 1 / RHYTHM 2 / MOTION 1"
colors:
  accent-today: "#FFCC00"
  accent-today-ink: "#1C1C1C"
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
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25rem
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: "0.05em"
    textTransform: uppercase
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1rem
    fontFeature: "tabular-nums"
rounded:
  container: "0px"
  control: "2px"
  pill: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "18": "72px"
  "88": "352px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.page}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "36px"
    hover: "90% opacity"
  button-outline:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    border: "1px {colors.rule}"
    rounded: "{rounded.control}"
    height: "36px"
  input:
    border: "1px {colors.rule}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
    height: "36px"
  nav-item-active:
    textColor: "{colors.ink}"
    fontWeight: 600
    textDecoration: "underline 2px {colors.ink}, offset 6px"
  filter-option-selected:
    textColor: "{colors.ink}"
    fontWeight: 600
    textDecoration: "underline 2px {colors.ink}, inset to the text"
  badge:
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  table-head:
    textColor: "{colors.quiet-ink}"
    typography: "{typography.label}"
    padding: "12px 16px"
  table-cell:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "12px 16px"
---

# CVRN Design System

Token values above match `app/globals.css`. If the two disagree, the CSS is current state and this file is the target; fix whichever is wrong on purpose.

## 1. Product

**What it is.** CVRN is the league platform for CVR Network, a competitive Roblox volleyball league in four regions (AS, EU, NA, SA). It covers the whole season: scheduling and results, per-set player stats, rosters, playoff brackets, season archives, articles and media, and the game's own reference data. Results and stats flow in from the Google Sheets the league already runs on.

**Who reads it.**
- **Players and the wider community are co-primary.** Players come for their own result, their own numbers and their team's position. Community followers come for the same facts from outside.
- **League staff and admins are secondary.** The smallest group by headcount, the heaviest by usage, and the only group that writes.
- **Reading happens mostly on desktop**, on the machine Roblox runs on. Dense multi-column layouts are the right default, not a compromise. Phone layouts still have to work fully.

**What they come to do.** Two jobs, roughly equal: check what happened (results, standings, who won) and look up a specific stat (a player's numbers, a roster, a box score). Following the season as a story (articles, media, playoffs, archive) is a bonus on top.

**Positioning.** Everything about the league in one place, permanently. Stats, history and schedules already exist, scattered across sheets and Discord. CVRN groups them, keeps them, and presents them better than a spreadsheet can. Avatars, team logos and fast syncing are the visible proof.

**Personality: broadcast-serious.** The interface treats a Roblox volleyball league with the gravity of a real sport: confident, structured, a little formal. Every screen claims *this competition matters*, and earns it by being organized, not loud. Copy follows the same rule: factual and specific, never hype, never winking at the fact that it's Roblox.

**With a game layer.** The reference feel is a pro league's own site (NBA-style): confident, star-driven, built around players and teams. On top of that, CVRN leans into being a league played inside a game wherever the content is a game object: player cards with OVR and tiers, rarity, records, the landing's representatives. The landing carries this layer hardest; reworked pages carry it in player and team identity; record pages barely at all. "Game layer" means game objects shown with pride, not gaming-site styling: the esports anti-reference below still holds.

### Principles

1. **Consolidation is the product.** Every screen reduces the number of places someone has to look. A fact that still needs a trip to a sheet or a Discord thread is the gap to close.
2. **Legitimacy comes from structure.** A permanent archive, a working bracket, per-set box scores. Nothing looks provisional or half-built.
3. **Answer in seconds, reward in minutes.** Get the user to the fact fast. Deeper material sits underneath, never in the way.
4. **Density earns its keep through hierarchy.** More data per screen than a typical app, on purpose. Rank, state and significance stay legible at a glance.
5. **The human layer is the advantage.** Avatars, team logos, names and identity are what a spreadsheet can't render. They are the reason to use the site, not decoration.

### Anti-references

- **A hobby-project dashboard.** Discord-bot-panel energy: untouched default components, inconsistent spacing, visibly unfinished surfaces.
- **A generic SaaS admin template.** Untouched shadcn defaults, purple gradient cards, hero-metric tiles, `rounded-2xl` on everything.
- **Esports and gaming tropes.** Neon accents, angular clip-path panels, RGB glows, aggressive italics, condensed display faces on scores. The obvious reflex for a gaming league and the wrong one for this brand.
- **A spreadsheet on the web.** Undifferentiated grids of numbers with no rank, state or weight. Density without hierarchy is the failure.

## 2. Direction

**North star: "The Record Desk."** A press box desk with the league's record book open on it. Everything on the desk is there because someone consults it: standings, box scores, the schedule, past seasons. From the record book: square corners, ruled lines, tabular figures, an archive that never loses a season. From the press box: density, speed, nothing between a question and its answer. The visual language is a broadcast stats graphic set for reading instead of for air.

The system rejects decoration standing in for authority. No gradient to make a heading feel important, no shadow to make a card feel modern, no neon to make a match feel exciting. Weight, rule lines and tabular alignment carry all of it.

### Dials by tier

The site runs at three energy levels. Every tier shares the same type, radius, rule lines, ink underline and neutral ramp, so the tiers differ in how loud they are, never in which system they belong to.

| Tier | Surfaces | ENERGY | RHYTHM | MOTION |
|---|---|---|---|---|
| **Landing** | `app/(landing)` | 3 | 3 | 2 |
| **Reworked** | Home, Matches, Standings, Teams, Team detail | 2 | 2 | 1 |
| **Record** | everything else (players, leaderboard, records, archive, playoffs, articles, media, information, admin) | 1 | 2 | 1 |

- **Landing, ENERGY 3:** the one surface whose job is to make an outsider feel the league is real. Big imagery, the representatives, asymmetric composition. MOTION 2 means transitions and the slideshow, not parallax or scroll choreography.
- **Reworked, ENERGY 2:** the pages people open every week. They get more presence than the record pages (team identity, the match hero, stronger hierarchy) but stay lookup-first. MOTION 1: state changes only.
- **Record, ENERGY 1:** lookup and reference pages. Unchanged in structure; they pick up the shared token changes and nothing else.

**Landing composition.** The art (the three representatives) fills the window pinned to its top edge, so any crop comes off the floor. Two views share it:
- **Menu:** a right-aligned title-screen group, right of center and a little above the middle: the `h1` CVR NETWORK, the subtitle "Confederate Volleyball Roblox Network", then the rows Continue (returning visitors only), View League and View Game. Rows are large bold caps text, never boxed buttons; dimmed at rest, full ink with the 2px ink underline on hover and focus. Nothing moves on hover.
- **League:** the same `h1` rises straight up to the top right and becomes the header, with Season {n} and the hint under it. The region names sit along the bottom at the art's thirds, positioned from the window's bottom edge. Hovering a player lights their cutout and shows their floating text (name, handle, awards, statline, no links) on the side opposite them. Back sits bottom left on the names' baseline.
- Over the art, selected and focused are the same ink text with the 2px ink underline as everywhere else.
- Below 768px, or in any window narrower than 3:2, the landing is a plain static page: the uncropped art, the title on its corner, and the links listed under it. Functional only for now; it gets its own design later.

The reworked tier is expected to absorb the record tier over time. When a record page gets reworked, it moves up a tier; it doesn't get a fourth style.

**Design Read (record tier):** league record and stats product for players, community followers and league staff, in a ruled broadcast-stats-desk language, dial ENERGY 1 / RHYTHM 2 / MOTION 1. The landing and reworked tiers each get their own Design Read when their rework starts.

**Identity motif:** the ink underline. Selected, current and you-are-here are always ink text at semibold with a 2px ink underline, never a fill and never a color. It repeats in the navbar, filters, view tabs, inline switches and the information segment picker, and it is what makes a CVRN screen recognizable at a glance. Square ruled containers and monospaced columns support it.

**One deliberate accent:** the "today" color, used only for what happens today. Actions are ink.

**No boxes.** Content sits directly on the page tone. Structure comes from whitespace and alignment, never a tonal box, and never full-width rule lines that cut a list into segments. A rule line belongs only under a heading or a table header. Only floating layers (dialogs, sheets, popovers) and controls (buttons, inputs) have a shape of their own.

**Focal point per screen:** the fact the user came for. On standings it is the table, on a match it is the score, on a player it is the stat line. Chrome defers to it.

## 3. Colors

Black, white and a true-neutral gray ramp (no hue tint, not Tailwind zinc), one accent, and two status colors. Each color has one job and no decorative use. Team logos, player avatars and GFX art carry the color of the site; the chrome stays out of their way.

**Palette count (R-29):** one accent. Red and green are status signals, not palette. The rarity colors are the game's own content and appear only where a rarity is named. Neutrals don't count.

### Actions are ink
Primary buttons are an ink fill with page-tone text (black on light, white on dark). Links are ink with an underline. The focus ring is a 2px ink outline at 2px offset. Clickable is told by shape and underline, not by color.

### Accent: today
**Ball yellow `#FFCC00`**, the color of a match ball. Dark mode: yellow text or a 6px yellow dot (13.1:1 on the page). Light mode: yellow text on white fails (about 1.5:1), so it becomes a highlighter mark, a square `#FFCC00` fill behind the word with ink text (`#1C1C1C`), like a marker on the record book. The word itself ("Today") always carries the meaning. Stay on true yellow: shifting toward orange (`#FF9000` territory) on black reads as a different, unwanted brand. It marks only what happens today in the region's timezone: the time on a match scheduled today, today's rows in Upcoming, today's matches on the Matches page. On a day with no matches it doesn't appear at all, which is the point: when it shows, it means "today". It is never a button fill, a link color, a hover, a border or a selected state.

### Retired
Cobalt (`#2D55E6` / `#1F46D1`) and amber (`#E8992C` / `#E89117`) are retired with the old scheme. Every current use moves to ink, to the accent if it is about today, or is deleted. Exceptions that stay as content: the update-log rework glyph and the 5-star spec fill (see Rarity) until they get their own decision.

### Destructive Red
`#EF4444`. Irreversible actions and error surfaces only: voiding a match, deleting a team, a failed sync row. Never a warning, never an accent.

### Success Green
`#157F3C` light / `#3ECC72` dark. Win and synced state.

### Neutrals
- **Page** (`#F4F4F4` / `#0A0A0A`, light value under review with the light-mode fix): the one tone all in-flow content sits on.
- **Surface** (`#FFFFFF` / `#141414`): floating layers only (dialogs, sheets, popovers, toasts). Never a card or panel in the page flow.
- **Recessed** (`#EEEEEE` / `#1F1F1F`): the hover and open-row fill (`/30`), input fills, disabled fills. It appears in response to the pointer or an open state, never at rest as a box.
- **Ink** (`#1C1C1C` / `#F5F5F5`): all primary text and data values.
- **Quiet Ink** (`#5E5E5E` / `#999999`): column labels, metadata, secondary values, placeholders.
- **Rule** (`#D9D9D9` / `#2B2B2B`): every border, divider and table line. Often `/30` for column groupings inside dense tables.

### Rarity
- **Rare** (`#2A62E5` / `#5C96F5`), **Epic** (`#8739D0` / `#B477EE`), **Mythical** (a seven-stop spectrum gradient, brighter in dark mode). Common is plain Ink.
- These are the game's rarity tiers, not categorical colors. They appear only where rarity is the thing being named: rarity headings on Abilities and Builds, rarity columns in the Builds pick tray, and 4-star (Epic) and 3-star (Rare) spec ratings. Never on rows, values or chrome.
- **Mythical gradient text** (`.text-rarity-mythic`) is sanctioned for the word "Mythical" and a Mythical rarity heading only. It is the one place gradient text exists, because the game itself draws Mythical as a spectrum.

### Rules
- **One accent, one job.** The accent means "today" and nothing else. A screen that uses it for an action, a hover or a highlight has broken the system.
- **No second accent.** Anything that isn't today, a status or a rarity comes from the neutral ramp. If a data category needs distinguishing, use position, weight or whitespace before hue.
- **Update-log change markers.** Inside an update log body only: green ▲ buff, red ▼ nerf, `~` rework, and a plain-text `NEW`. Each is a glyph or one word, never a fill, and each is also carried by its shape or word. Headings in update logs stay neutral. The rework and `NEW` colors move off amber and cobalt in the token pass.
- **Never color alone.** Win/loss, qualified/eliminated and synced/failed each carry a second cue: a glyph, a label or position.

## 4. Typography

**IBM Plex Sans** for all text, **IBM Plex Mono** for figures, both via `next/font` with `display: swap`. `font-size-adjust: 0.54` on the body matches Plex's x-height to the fixed rem scale.

**Why Plex:** it is an engineered, slightly formal grotesque that reads as institutional rather than friendly, which fits broadcast-serious. Its mono sibling shares the same skeleton, so numbers in mono columns sit with the sans text instead of looking like a second system.

### Hierarchy
- **Headline** (600, 24px, `-0.025em`): page titles. The largest type in the product.
- **Title** (600, 20px, `-0.025em`): section headings.
- **Subtitle** (500, 18px): sub-sections and group titles.
- **Body** (400, 14px / 20px): table cells, form values, descriptions, nav items. Prose caps at 65 to 75ch; tables run as wide as the data needs.
- **Label** (600, 12px, uppercase, `0.05em`): column headers, stat labels, metadata keys. Always Quiet Ink. Uppercase with light tracking separates a header from the data cells under it at the same 12px size; it is never used as a decorative section eyebrow.
- **Data** (400, 12px, mono, `tabular-nums`): every number that sits in a column.

### Rules
- **Two faces, no third.** Plex Mono appears only on numbers. A serif heading or condensed score face is the fastest route to the esports look this brand rejects.
- **Tabular figures, always.** Any number in a column gets `font-mono tabular-nums`. Proportional digits make columns shimmer as values change.
- **Fixed scale.** No `clamp()`, no viewport-relative type. Responsive behavior is structural: collapse, stack, scroll.
- **12px floor.** Nothing a user must read goes below `0.75rem`, and text at that size sits in Ink or Quiet Ink at full opacity.
- **Update-log exception.** In an update log body, `#` sections are 36px semibold (`-0.03em`), larger than the 24px version title, because a patch note is read by section. `##` categories are Label style, `###` features are 18px semibold Ink. This is the only type step above Headline.
- **Landing exception.** The landing tier sets its own sizes, all fixed px. The title is CVR NETWORK in caps, semibold, `0.14em` tracking: the region names are bold, tight caps, so the league's name takes the same caps voice in a lighter, spaced cut to read as the header above the choices rather than a fourth choice. It is 80px in the menu and 40px as the League header (rendered at 80px and scaled to 0.5), 28px on the phone page. Menu rows 34px bold caps, Continue 20px semibold; region names 48px bold caps; floating display names 44px bold.

## 5. Elevation

Flat, and one level. Everything in the page flow sits on the Page tone with no box, no fill and no shadow. The only things raised off the page are floating layers: dialogs, sheets, popovers, tooltips, toasts. They use the Surface tone, a 1px Rule border and `shadow-lg`.

**Clickable without a box.** An item that navigates somewhere says so at rest without a frame: its name is Ink semibold (the thing you'd click), and rows that open something end in a 12px Quiet Ink chevron. On hover the row takes the Recessed `/30` fill and the name underlines, at 150ms. No border appears, nothing lifts.

## 6. Components

### Content on the page (no panels)
`.panel` is retired as a content container. Standings, box scores, match lists, team grids, stat blocks and media posts sit directly on the page.
- **Grouping:** a heading, then the rows, then whitespace (44px) before the next group. A 1px Rule line under a heading only where the group would otherwise blur into the next.
- **Grids (teams, media):** each item is its image or logo plus its name, aligned to a shared baseline. The gap between items does the separating. No tile behind them.
- **Images and GFX** have their own natural edge (a photo, a match graphic), so they need no frame. Square corners. On hover a graphic only changes cursor and its caption underlines.
- **Admin forms** group fields by heading and whitespace the same way. A dialog is the only boxed form.

### Buttons
- 2px radius. 36px default height, with 24 / 32 / 40px steps and matching square icon sizes.
- **Primary:** ink fill, page-tone text, `8px 16px`. Hover drops to 85% opacity, active to 75%.
- **Outline / Ghost:** transparent fill, Rule border on outline. Hover fills Recessed.
- **Destructive:** irreversible operations only. See Open decisions for its contrast.
- **Secondary (amber fill)** is retired. Use outline for secondary actions.
- **Focus:** one vocabulary everywhere: a 2px ink outline at 2px offset. Navigation uses the same.

### Inputs
- Transparent fill (dark mode `input/30`), 1px Rule border, 2px radius, 36px tall, `4px 12px`.
- Focus: the ink outline. Transition on `color` and `box-shadow` only.
- Error: `aria-invalid` drives a red border and a red ring at 20% (40% dark), plus a text message under the field.
- Placeholder: Quiet Ink, never lighter. Every field has a visible label.

### Badges
Pill radius, `2px 8px`, 12px medium, neutral (Quiet Ink text, Rule border, no fill). Badges only carry a real status or label (role, a void match). Ordinary states like scheduled or completed are plain text, not badges; a completed match shows its score instead. No "New" or "Beta" decoration, no tinted status pills.

### Tables
The signature surface of the product.
- **Header:** Label style in Quiet Ink, no band, one 1px Rule line under it.
- **Cells:** Body, 12px vertical / 16px horizontal padding (8px horizontal below `sm`). Rows are separated by their padding; dense stat tables may add a Rule `/30` line between rows where the eye loses its place.
- **Row hover:** Recessed `/30`. No zebra striping.
- **Numbers:** mono, `tabular-nums`, centered. Text columns left-align. The leading identity column is sticky on wide tables.
- **Column groups:** dense stat tables use a two-row header with a group band, separated by Rule `/30`.

### Ruled sections
Grouping list content without a container: a heading, a 1px Rule line under it, the rows, then whitespace before the next section. Used by Records. No fill, no surrounding border, so it doesn't box every list into a card.
- Heading 14px semibold Ink, 8px gap, then the Rule line (never an Ink line, which reads as a white bar in dark mode).
- Rows separated by their padding, no Rule line between them. Records still draws row lines; that is current state, not the target.
- 44px vertical between sections, 48px horizontal in a grid.

### Filters
Shared components live in `app/components/filters/`.
- **Selected state:** the identity motif. Ink, semibold, 2px Ink underline inset to the text. Unselected options are Quiet Ink medium, Ink on hover. No fill, no box, no cobalt.
- **Option rows (`OptionRow`):** 12px semibold Quiet Ink label, then plain-text options. "All" first, separated by a 1px Rule divider. Season numbers in mono. Multi-select marks every selected value; "All" clears.
- **View tabs (`ViewTabs`):** tabs on a full-width Rule line; the selected tab carries a 2px Ink bottom border over it. Page tools sit at the right end of the line and drop below it when space runs out. `StatViewSelector` fits the rule to the tabs' width.
- **Inline switch (`InlineSwitch`):** two or three text options separated by a Rule-tone `/`, the selected one underlined.
- **Inline over dropdown.** When every option fits on one line (regions, seasons, positions, stat views), render them inline. A popover is for controls that can't be inline (a date calendar) and for global context (the navbar region/season picker). No floating square dropdowns for choices that fit in the page.

### Navigation
- **Planned change:** the public navbar will be reworked alongside a public profile section (sign-in with Roblox and Discord). Until profiles exist, the navbar carries no profile or sign-in slot for them. The spec below is current state.
- Horizontal link row at `lg` and up, a vertical stack in a sheet below it. Items 36px tall, 12px horizontal padding, square, 14px medium.
- **Default:** Quiet Ink. **Hover:** Ink with a Quiet Ink 2px underline. **Active:** Ink semibold with a 2px Ink underline at 6px offset.
- **Grouped items (public Information):** click opens an anchored panel, 320px, square, Surface fill, 1px Rule border with no top border so it attaches flush to the header, Overlay shadow, 12px padding. A Label-style group name, then one row per child (14px semibold). Hover and the current page get Recessed; the current page shows a right-aligned "Here". Opacity plus a 4px rise over 200ms, instant under reduced motion.
- **Grouped items (admin strip):** the admin navbar is one 52px row. Clicking a group name opens a full-width 44px strip under the header, drawn over the page so the page never moves: Surface, 1px bottom Rule, Overlay shadow, square, items aligned to the page gutter, sticky with the header. Clicking another group swaps contents; clicking the open group closes it. Closes on navigation, Escape and outside click. Click only, never hover. A group name is underlined when the current page is inside it or its strip is open. The current page is the longest nav route that prefixes the pathname. Below `lg`, the sheet lists pages under Label-style group names. Roles that see 3 pages or fewer get flat links.
- **Region / season picker:** separates region from season by tone, not color: region code in mono semibold 12px on Recessed, a 1px Rule hairline, season name on Page. The popover has a fixed width: boxed region buttons with the selected one filled Quiet Ink (light text), current season on Recessed with a Rule border. No cobalt. In admin it renders only on pages that read it.

### Information area
Public reference pages for the game's own data (`/information/*`).
- **Segment picker:** ABILITIES / BUILDS / UPDATES / SPECS, written in caps because they are the game's own section names. At 640px and up, a centered line of 14px medium text separated by Rule-tone `/`; the current segment carries the identity motif. Below 640px, a 2 + 2 tonal strip on Recessed `/45`; the current segment takes the Page fill with an inset 2px Ink bottom line. It is the page's only header.
- **Rarity lists (Abilities, Builds):** whitespace only, no row rules, no boxes. Groups headed by the rarity name in its rarity color (Abilities add Normal / Lucky odds in mono), 44px between groups. Row hover and the open row are Recessed `/30`. A row with more to show ends in a 12px medium Quiet "See more" / "See less". Opening animates height over 200ms (`grid-template-rows` 0fr to 1fr), instant under reduced motion. One open row at a time, kept in the URL.
- **Inspector:** ability details in three containers with the same content. A floating card on hover-capable desktops (Surface, 1px Rule, Overlay shadow, square, 150ms fade plus 4px rise, 200ms open delay, triggered by a dotted-underline name); a bottom sheet on touch or below 768px; docked beside the kit names on the spec page, where clicking a name switches it.
- **Row-fill bar (Heights):** a Recessed fill behind the whole row, width proportional to the row's weight over the top weight. Hover steps the fill to the Rule tone and the odds to Ink. Dropped on phone.
- **Slot filters with an in-page tray (Builds):** 190px slots on Recessed `/45`, Label on top, value "Any" in Quiet Ink or the pick in Ink semibold with an `×` to clear. Clicking a slot turns it into the input (Recessed `/90`, inset 2px Ink bottom line, ghost completion in Quiet Ink, Tab completes). Options open in the page under the slots, never in a floating box: rarity columns of Quiet names that go to Ink on Recessed `/90` when hovered or active, and a 12px "Close" at the top right. Typing hides non-matches in place. Phone stacks the slots full width.
- **Spec photos:** real player photos at 4:5, `object-position: 50% 20%` so heads survive. Gallery cards carry a lower third: a black gradient over the bottom 40% with the name in white, and stars plus height on a fixed bottom row. The gradient exists for legibility over arbitrary photos and is sanctioned on spec photos only.
- **Wording editor (admin Information):** editors appear only when an ability shows its DERIVED description; ORIGINAL shows the game text alone. Each line collapses to its sentence (chevron, plus a Quiet Ink dot when a part is unverified or unhandled). Expanding shows the raw game line in mono and one row per component: tag on the left, labelled plain inputs, and an `InlineSwitch` for the number format. Each expanded line has its own Save; when a change reaches other abilities, Save first shows the old line struck through in Quiet Ink and the new one in Ink, with a confirm. No boxes, no sticky bars.

### Page containers
Three widths chosen by content density: `.page-narrow` (1280px) for forms and reading, `.page-wide` (1440px) for the standard public shell, `.page-bleed` (1920px) for the widest stat tables. Gutters 16 / 24 / 32px.

### Icons
- **Functional glyphs only.** An icon appears only where it names a control or an action: chevron for navigation, `×` for clear, sort direction, menu, external link. lucide-react stays as the source for these.
- **No icon as illustration.** No calendar on an empty schedule, no trophy on a champion block or an empty state, no icon beside a heading or inside a skeleton. Empty states are text (see States). The data, team logos and player avatars are the imagery.
- Icon-only controls carry an `aria-label`; the icon is `aria-hidden`.

### Radius
Three radii, no fourth: containers 0px, controls 2px, badges pill. `rounded-xl` (shadcn's `<Card>` default) is not used on any surface.

## 7. Motion

- Transitions run 150 to 250ms on `color`, `box-shadow`, `opacity` and `transform` only.
- Motion confirms a state change (hover, open, close, sort, expand). It never introduces content on scroll and never loops.
- Every transition has a `prefers-reduced-motion: reduce` alternative, usually instant.
- **Landing exception.** The landing's menu to League change is the one orchestrated scene transition allowed to run up to about 1.8s: rows fade out in 350ms, the art's darkening and blur (`filter`) lift over 1.4s, its zoom settles over 1.8s, the title rises over 1.2s, then the header lines, region names (staggered) and Back fade in. Going back plays it in reverse. Under reduced motion it is a 200ms crossfade where nothing moves or scales. Everything else on the landing keeps 150 to 250ms.

## 8. States

- **Loading:** skeletons that match the real layout, so nothing shifts when data lands.
- **Empty:** centered Quiet Ink text in the space the content would fill, naming what will appear and how it gets there. Never boxed.
- **Error:** the same placement, in plain words, with a retry where one makes sense. Not-found and failed loads are not wrapped in a panel either.

## 9. Accessibility

Target is **WCAG 2.2 AA**, not best effort.
- Text 4.5:1, large text (18px+, or 14px+ bold) 3:1, non-text UI parts and meaningful glyphs 3:1.
- Every control is a native `<button>` or `<a href>`, reachable by Tab in visual order, with the 3px focus ring visible.
- Dialogs, sheets, strips and popovers close on Escape and return focus to their trigger.
- Icon-only buttons have an `aria-label`; decorative images have `alt=""`.
- Tap targets 44px on touch layouts.

## 10. Do and don't

**Do**
- Put content straight on the page tone; group with headings and whitespace.
- Mark clickable items with an Ink semibold name and, for rows, a trailing chevron; Recessed fill and underline on hover.
- Set `font-mono tabular-nums` on every number in a column.
- Keep actions ink; mark selected and current with the ink underline; keep the accent for today.
- Keep type on the fixed rem scale and make responsive behavior structural.

**Don't**
- A tonal box (Surface or Recessed fill, or a bordered frame) around content in the page flow: cards, tiles, panels.
- Full-width rule lines between rows or list items, segmenting a list into strips.
- Gradient text, except the Mythical rarity name.
- A colored `border-left` or `border-right` as an accent stripe.
- A gradient wash behind content.
- A box around an empty, zero, failed or not-found message.
- A shadow on anything in the page flow.
- Decorative icons beside headings or in empty states.
- A second sans, a display face, or `clamp()` headings.
- A third accent hue for categorical data.
- Esports tropes: neon, clip-path angles, RGB glow, aggressive italics.

**Screenshot test:** if a new surface could be dropped into a shadcn starter template without looking out of place, it is wrong. Content on the bare page, the ink underline, monospaced columns and color coming only from logos, avatars and today are what identify a CVRN screen. Losing any one of them is the system eroding.

## 11. Decisions and reasons

| Decision | Reason |
|---|---|
| True-neutral gray ramp | Team logos and avatars carry the color; a tinted field would fight them. |
| Accent means "today" | Match day is the one recurring moment worth interrupting the black and white for, and it's backed by `scheduled_at`. |
| Ball yellow, not green or ice blue | It's the sport's own object; green would equal a win on the same rows, ice blue reads as a link. |
| Actions in ink | Clickable reads from shape and underline, so the accent stays free for its one job. |
| Ink underline for selected | Selected is a state; one repeated mark makes it recognizable on every page. |
| No boxes in the page flow | Tonal boxes on the page are the most common template tell and Kevin's least favorite pattern; whitespace groups without framing. |
| No line breakers between rows | Full-width rules chop a list into segments, which reads as boxes drawn with lines; Kevin dislikes them. Padding and the hover fill separate rows. |
| Square corners, 2px controls, pill badges | Radius tells the eye what kind of thing it is: floating layer, control or status. |
| Plex Sans + Mono | Institutional tone, and a mono sibling that keeps figures in the same family. |
| Uppercase 12px labels | Separates a column header from same-size data cells without adding weight or color. |
| Flat, one shadow | Only what floats is raised; everything else shares one plane. |
| Dense 14px body | The audience reads on desktop and comes for lookups; more rows per screen means fewer scrolls. |
| Rarity colors and Mythical gradient | They are the game's own tiers, so showing them is content, not decoration. |
| Spec photo gradient | Keeps white names legible over arbitrary photos. |
| Lucide for functional glyphs only | A glyph that names an action helps; one that illustrates a section is template decoration. |
| Dark default (temporary) | The current light mode hurts to read. Dark stays default until light mode is fixed, then the default is revisited. |
| Three dial tiers | The landing sells the league, weekly pages carry identity, reference pages stay quiet; one shared system keeps them related. |

## 12. Open decisions

These need Kevin's call before this file counts as finished.

1. **Game layer on reworked pages.** How far player cards, tiers and rarity show up on Home, Matches, Standings, Teams and Team detail is decided per page during each rework.
2. **Destructive red contrast.** White on `#EF4444` is **3.76:1**, so destructive button labels fail AA at 14px; red text on white is also 3.76:1. Needs a darker light-mode red. (Cobalt and amber contrast failures are moot now that both are retired.)
3. **Light mode is a defect, not a choice.** Dark is default because light mode is uncomfortable to read. The toggle ships, so light mode has to work (antislop R-34). Fixing it is part of the token pass. Dropping the gray page under white panels removes the main two-tone glare, but the light page tone itself still needs a decision.
4. **5-star spec fill and update-log `~` / `NEW` colors.** These used amber and cobalt. The 5-star gold now sits next to ball yellow; they only appear on Information pages, where "today" never does, but they need new values (or ink) so yellow keeps one meaning.
