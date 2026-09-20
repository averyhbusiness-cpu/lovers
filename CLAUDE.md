# StoreFrontFix — project context

Owner: Avery Hall, Byron MN. Sole proprietor, no LLC.
Live site: https://storefrontfix.com (also www.)

## What the business is
Web design + website hosting for local businesses.
- Build fee: one-time, $600 default, $400–1200 range.
- Hosting: $40–60/month recurring.
- Never bundle the two. Never discount the monthly.
- Client registers their own domain, in their own name.
- This is NOT a Google-listing repair business. Don't write copy about listings.

## Stack
Plain static HTML/CSS/JS. No build step, no framework, no npm.
Deployed to Cloudflare Workers via the dashboard's "Upload your static files" flow.
Worker project name: `royal-resonance-dd53`.
Theme: near-black `#030406`, off-white `#e9eaee`, drifting starfield canvas.

## Files
```
index.html      homepage — headline "They looked you up"
about.html      about + trust list (two prices up front, cancel anytime)
contact.html    contact form
hosting.html    client-facing code entry — loads a hosted client site
admin.html      Avery-only upload UI (zip or loose files) — linked from footers only
worker/         the order-123 uploader worker (separate deploy, see below)
sites/maple-street/   example client site, placeholder until a real one exists
SETUP-order-123.md    step-by-step for the worker + R2 setup
```
Every footer has a dim `.admin-link` bottom-right. Not in the nav.
There is no pay.html — it was deleted on purpose. Stripe links get emailed directly.

## "Order 123" — hosting system (BUILT, NOT YET WIRED UP)
Avery uploads a client site at /admin with a code he picks (e.g. `maple-street`).
Client goes to /hosting, types the code, site opens full-screen, no StoreFrontFix branding.
Or send `storefrontfix.com/hosting?code=maple-street` to skip the typing.
Code `demo` loads a built-in offline sample and works right now with no backend.

### Remaining setup steps (Cloudflare dashboard)
1. Pick an admin key, 20+ chars. Write it down — Cloudflare won't show it again.
2. Storage & databases → **R2 Object Storage** (not R2 SQL) → create bucket named exactly
   `storefrontfix-sites`. Not public. Card required for verification, free to 10 GB.
3. Compute → Workers and Pages → Create → Hello World → name it `storefrontfix-uploader` → Deploy.
4. Edit code → delete everything → paste `worker/worker.js` → Deploy.
5. Settings → Bindings → Add → R2 bucket. Variable name `SITES` (capitals). Bucket `storefrontfix-sites`.
6. Settings → Variables and Secrets → Add → type **Secret**, name `ADMIN_KEY`.
7. Settings → Domains and Routes → Add Route, zone storefrontfix.com:
   `storefrontfix.com/api/*` and `storefrontfix.com/sites/*`
8. Test: upload maple-street through /admin, then load it at /hosting.

## Stripe (done)
Legal name Avery Hall. Public name Avery Hall (using "Storefront Fix" publicly would
require a Minnesota Certificate of Assumed Name — declined). Category: Other business services.
Radar Standard on. Tax calc, Climate, Managed Payments, Billing all off.
Payment links are one-off, flat rate, USD, collecting customer + business name.

## Deploy
Zip the contents so the folder `storefrontfix/` is at the root, upload through the
Cloudflare dashboard. Do not include `wrangler.jsonc` in that upload — it's CLI-only
config and it blocks the Deploy button.

## Known gotchas
- Cloudflare's dashboard menu paths change often. Check the screen before trusting a path.
- Mobile nav breaks past four links; there's a `@media(max-width:720px)` block that
  stacks the brand above centered links. Keep it if you add a page.
- The old about-page copy promised "one flat fee, no monthly charge." That contradicts
  hosting. Don't reintroduce it.
