# Analytics

Two analytics surfaces are wired into the site. One is the legacy
StatCounter we inherited from the Jekyll era; the other is an opt-in
slot for Plausible.

## StatCounter (active)

Project ID: `13144757` · Security hash: `d39bf83e`

Embedded in `src/layouts/BaseLayout.astro`. Both the async JS snippet
**and** the `<noscript>` `<img>` fallback are present, matching the
shape the legacy Jekyll site used. The hash is preserved so the
StatCounter dashboard's historical traffic for `cyanmishra92.github.io`
continues onto the v2 site without resetting.

```html
<script is:inline>
  window.sc_project = 13144757;
  window.sc_invisible = 1;
  window.sc_security = 'd39bf83e';
</script>
<script is:inline async src="https://www.statcounter.com/counter/counter.js"></script>
<noscript>
  <div class="statcounter">
    <a title="Web Analytics" href="https://statcounter.com/" rel="noopener noreferrer">
      <img class="statcounter"
           src="https://c.statcounter.com/13144757/0/d39bf83e/1/"
           alt="Web Analytics"
           referrerpolicy="no-referrer-when-downgrade" />
    </a>
  </div>
</noscript>
```

### Verifying after deploy

1. Visit `https://cyanmishra92.github.io/` once.
2. Open the StatCounter dashboard at https://statcounter.com → project
   13144757.
3. **Recent visitor activity** should show your hit within a minute.
4. If it doesn't show up, common causes:
   - Browser blocks `statcounter.com` via tracker-blocker. Open in a
     fresh profile.
   - Hash mismatch — should be `d39bf83e` in both the JS snippet and
     the `<img>` URL.
   - Project ID mismatch — should be `13144757` in both.

### Why preserve the legacy hash?

StatCounter's "security hash" (`sc_security`) gates which hostnames are
allowed to report into a project. The hash on the legacy Jekyll site
(also `cyanmishra92.github.io`) was `d39bf83e`. Keeping it identical
means the v2 site is recognized as the same source — no analytics
discontinuity in the dashboard.

If you ever rotate this hash in StatCounter's settings, mirror it in
both the snippet and the `<noscript>` image URL.

## Plausible (opt-in, currently disabled)

Plausible is privacy-friendly and free for low-traffic personal sites.
Disabled until you sign up.

### To enable

1. Sign up at https://plausible.io and add the site
   `cyanmishra92.github.io`.
2. Repo **Settings → Variables → Actions** → new variable
   `PUBLIC_PLAUSIBLE_DOMAIN` = `cyanmishra92.github.io`.
3. Push. The next deploy injects:
   ```html
   <script is:inline defer
           data-domain="cyanmishra92.github.io"
           src="https://plausible.io/js/script.js"></script>
   ```

### Cohabitation with StatCounter

Both can run side by side. They don't conflict; they just produce two
slightly-different views of the same traffic. StatCounter is the
historical source of truth; Plausible is the cleaner real-time
dashboard.

## Privacy note

Neither tool sets cookies or fingerprints visitors in any way that
would require a GDPR/CCPA banner under most legal interpretations. We
don't collect IPs at the application layer; both vendors aggregate
without persistent identifiers.

If you ever add a heavier analytics pipeline (GA4, Mixpanel,
Hotjar-style heatmaps), revisit this and add a consent banner.
