# VN layout: first iteration

Establish the general composition before refining artwork or decoration.

- [x] Replace the desktop shell with a 35% navigation / 65% content split.
- [x] Add a fixed white backdrop fading gradually beyond the 35% boundary.
- [x] Add a large placeholder wordmark above vertically stacked navigation.
- [x] Keep login and walker controls near the bottom; support short-screen scrolling.
- [x] Centre readable content in the right region and stack secondary panels there.
- [x] Provide compact navigation above full-width content on narrow screens.
- [x] Run Astro checks and production build; confirm preview routes respond.
- [ ] User visual review: panel width, fade, logo position, button scale, content balance.

## Implementation choices

- Use the existing site title as a temporary logo; retain current links and controls.
- Put post contents above the article and homepage previews/changelog below main content.
- Keep panel width, fade distance, logo size, and navigation gap adjustable in base CSS.
- Preserve the existing background, page reveal, and decorative characters.
- Presentation-only changes do not need tests restating CSS or static markup.

## Follow-up style adjustments

- [x] Narrow desktop navigation to 27% and extend the fade from 9vw to 18vw.
- [x] Move the desktop logo/menu down an additional 30vh; keep mobile compact.
- [x] Use shared h1 sizing, white text, and the existing dark outline for main navigation links.
- [x] Remove repeated content page headings while retaining accessible main landmark labels and article titles.

## Surface experiment

- [x] Remove backgrounds and smoke shadows from main content and shared secondary sections.
- [x] Keep existing spacing; retain surfaces on floating menus so overlapping text stays legible.
- [x] Review the sections directly over the background artwork: rejected; restore panels.

## Restored panels and visual centring

- [x] Restore blue backgrounds and shadows with the shared 12px panel radius.
- [x] Reduce desktop outer spacing from 3rem/2rem to 1.5rem/1rem and section gaps to 1rem.
- [x] Centre content after the full navigation width plus fade (currently 30% + 18vw).
- [ ] Review restored panels and the adjusted visual centre.

## Homepage subsections

- [x] Vertically centre short content within the viewport (below the navigation on mobile); let long pages expand and scroll normally.

Superseded by the right-edge card experiment below.

- [x] Place latest updates and changelog below index.md inside the main panel (revised from a right column).
- [x] Remove nested panel surfaces and retain the single row of four pix thumbnails.
- [x] Stack the subsections below the introduction at all screen sizes.

## Right-edge card experiment

- [x] Extend content cards to the right viewport edge with rounded left corners.
- [x] Replace vertical centring with a strong top gap (18vh, bounded to 5–12rem on desktop).
- [x] Move footer quotes and social links beneath the side navigation, preserving the per-page quote setting.
- [x] Retain a smaller top gap and right-edge cards on mobile.

## Initial verification record

- `npm run check`: 0 errors, 0 warnings, 2 hints in generated SimpleMotion JavaScript.
- `npm run build`: passed; Vite reported a bundle-size warning.
- Existing background dev server: http://localhost:4321.
- HTTP checks: `/`, `/me`, and `/posts/new` returned 200.
- Browser visual inspection remains pending because browser tooling was unavailable.
- Review desktop, short desktop, and mobile widths, plus a long post and the editor.
