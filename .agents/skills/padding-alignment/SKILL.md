---
name: padding-alignment
description: "Fix inconsistent padding, unequal panel headers, dropdown spacing, and clipped action buttons in existing web interfaces. Use for focused spacing and alignment repairs from screenshots or UI reports, while preserving the product's design and behavior."
---

# Padding Alignment

Repair the reported layout using the existing design system. Preserve labels, actions, data, and visual hierarchy unless the user requests a change.

## Diagnose the actual constraint

Inspect the supplied screenshot and the affected DOM/CSS before editing. Identify the intended peers: two panel headers, a field and its menu, or an action group inside a card. A crop can show a symptom without showing its cause.

- Compare computed padding, border, line height, font, box sizing, and child structure. Equal padding alone does not guarantee equal rendered height.
- Check inherited `white-space: nowrap`, flex/grid minimum sizes, long labels, and the nearest ancestor with clipping or scrolling.
- Distinguish a native select's closed field from its system-rendered popup; they may obey different styling rules.
- Find existing shared components and responsive rules before adding overrides. Scope changes to the affected component family.

Work in the user's selected branch when one exists. Do not bundle unrelated UI redesigns into a spacing fix.

## Align related headers

Use the same component structure and shared spacing rules for headers with the same role. Remove obsolete competing styles when safe, rather than adding another exception for each panel.

Align title baselines and trailing metadata as well as the outer boxes. Prefer existing spacing tokens. Values used in a previous project are examples, not defaults for every product.

For equal single-line headers, shared typography, padding, borders, and layout usually give equal height. If titles can wrap, preserve the text and allow growth; use a shared minimum size or parent layout when equal sizing is still required. Do not force equality with a fixed height that clips text at narrow widths or increased zoom.

## Fix dropdown spacing and placement

Keep a native select when adjusting its field padding and chevron space solves the issue. Its operating-system popup cannot reliably be restyled with field CSS alone.

When consistent popup styling is part of the request, prefer an existing accessible select/listbox component. Reuse established behavior as well as appearance. A custom picker must preserve:

- A visible accessible label, expanded state, selected state, and trigger-to-popup association.
- Keyboard opening, option navigation, selection, Escape, and predictable Tab behavior.
- Visible focus, focus return after selection or Escape, and dismissal on outside interaction.
- The existing form value, validation, disabled state, submission behavior, and action guards. A hidden input alone does not preserve native required-field validation.
- Event cleanup when the picker closes or its parent rerenders; avoid stale document listeners.

Give the selected text and chevron separate space. Check long options and both open/closed states. Choose placement based on available room: an inline expanding list can keep all options visible in a short card; a floating menu may require a portal and collision handling. Increasing `z-index` does not escape an ancestor's `overflow: hidden`.

## Keep actions inside the panel

Treat the panel's available width as the constraint, not just the viewport. A desktop sidebar can create a narrower action area than a mobile layout.

- Let action rows wrap or use responsive grid tracks; remove inherited nowrap where labels need to wrap.
- Permit flex/grid children to shrink with an appropriate minimum width. Preserve readable labels and usable hit areas.
- For one primary action and secondary alternatives, a full-width primary row with secondary actions below is often appropriate. Stack the secondary actions when their labels need more room.
- Avoid hiding overflow, ellipsizing essential action labels, or shrinking type to disguise clipping. Do not globally change every button to fix one action group.

Use [layout-patterns.md](references/layout-patterns.md) when a concrete CSS pattern or browser measurement would help. Adapt its selectors and values to the actual UI.

## Verify the affected experience

Use the project's browser tooling when available. Check the reported layout and a narrow layout; include the narrowest affected panel and longer labels. When zoom or wrapped text caused the issue, reproduce that condition too.

1. Wait for fonts to load, then compare rendered header heights, padding, and title positions. Allow a small tolerance for fractional pixels; state which layouts were measured.
2. Inspect screenshots as well as geometry. Confirm labels, focus rings, menu options, and buttons are visible and contained, with no accidental overlap or horizontal scrolling.
3. If dropdown behavior changed, exercise pointer and keyboard selection, dismissal, focus recovery, validation, and the action that consumes its value. Check other consumers of a shared picker.
4. Recheck the meaningful state transitions affected by the edit, such as opening a menu or resolving an item. Reuse prior checks when their inputs are unchanged.

Do not add permanent tests that merely assert the chosen CSS values. If a browser is unavailable, report the verification limit instead of claiming visual validation.

## Deliver

Summarize the visible fix and the layouts/interactions checked. Follow the project's existing commit and preview workflow, including any standing publication preference. A request to fix spacing does not by itself authorize a merge or creation of a new hosting project. Only report a preview as updated after a successful deployment.

Keep this skill portable: do not embed personal paths, repository names, site IDs, credentials, or conversation timestamps.
