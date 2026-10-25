# Right-edge cards

`src/components/ui/EdgeCard.astro` provides the shared blue surface, rounded left corners,
subtle neon-blue glow, and a thick white glowing strip along the full left edge. The component fills its
parent; the page layout positions cards flush with the viewport edge.

The main content already uses an EdgeCard. Add more independent cards through the
PageLayout `cards` slot, keeping page-specific content outside the UI primitive:

```astro
---
import PageLayout from '../components/PageLayout.astro';
import EdgeCard from '../components/ui/EdgeCard.astro';
---

<PageLayout title="home">
  <p>Primary content</p>
  <EdgeCard slot="cards" aria-label="latest updates">
    <h2>latest updates</h2>
    <p>Additional content</p>
  </EdgeCard>
  <EdgeCard slot="cards" aria-label="changelog">
    <h2>changelog</h2>
    <p>Recent changes</p>
  </EdgeCard>
</PageLayout>
```

Use `as="article"`, `as="aside"`, or `as="div"` where appropriate; the default is `section`.
Colours and glow strength live in `base_tokens.css`; geometry lives in `base/edge-card.css`.

For pages made entirely of separate cards, pass `separateCards` to `PageLayout` and
place `EdgeCard` components in its default slot. This keeps the cards inside the main
landmark, with a shared 0.5rem gap and no enclosing surface. The blog listing uses this
mode for author controls, tags, and individual posts (`PostList cards`). Filtered posts
retain the same shared card class when the browser rebuilds the list.
