# StoreFrontFix — handoff

Everything a fresh session needs to pick this up. Written 2026-09-20.

---

## 1. Who and what

Avery Hall, 19, Byron MN. Sole proprietor — no LLC, no DBA, no assumed-name filing.
Email averyhbusiness@gmail.com. Site phone (507) 517-4697.

**The business is web design and website hosting for local businesses.**
It is not Google-listing repair. It used to be, the site copy was rewritten off that
positioning, and reintroducing listing language would be a regression.

## 2. How he wants to work

- Short, blunt answers. No preamble, no unsolicited context.
- Fuller explanations only when he's trying to learn something.
- Don't ask clarifying questions — make the call and state the assumption.
- He uses voice-to-text. Read typos charitably.
- Get it right the first time. Before giving a UI path or a field name, check which
  screen/version is actually in front of him instead of guessing from memory.
- Keep answers scoped to the thing he asked about. No reminders about other projects.

## 3. Pricing — settled

| Thing | Price |
|---|---|
| Build | $600 default, $400–1200 range, one-time |
| Hosting | $40–60/month, recurring |

Rules he decided on:
- Never bundle build and hosting into one number.
- Never discount the monthly.
- Round numbers. No charm pricing ($599 etc).
- Don't itemize Stripe fees to the client.
- Don't say "I'll work with your budget."
- Client registers their own domain, in their own name. Site copy says so.

## 4. Stack and hosting

Plain static HTML/CSS/JS. No build step, no framework, no package.json.
Theme: near-black `#030406`, off-white `#e9eaee`, drifting starfield canvas.

Live at storefrontfix.com and www.storefrontfix.com.
Deployed to **Cloudflare Workers** through the dashboard's "Upload your static files" flow.
Worker project name: `royal-resonance-dd53`
(default URL royal-resonance-dd53.averyhbusiness.workers.dev).

Domain registrar is **Namecheap**, not Cloudflare. Nameservers were pointed at Cloudflare:
`dorthy.ns.cloudflare.com` and `norman.ns.cloudflare.com`, set under Custom DNS. Zone is Active.

## 5. Files

```
index.html      headline "They looked you up". Before/after = "No website" / "Your site, live"
about.html      trust list — two prices up front, cancel anytime, domain in client's name
contact.html    contact form
hosting.html    client-facing code entry, loads a hosted client site full-screen
admin.html      Avery-only upload UI. Zip or loose files. Linked from footers, not nav
worker/worker.js       the order-123 uploader worker — separate deploy from the site
worker/wrangler.jsonc  CLI-only config
sites/maple-street/    example client site, placeholder until a real client exists
SETUP-order-123.md     click-by-click for the worker + R2
CLAUDE.md              short version of this file
```

There is **no pay.html**. It was built, iterated four times, then deleted on purpose.
Stripe links get emailed to clients directly. Don't rebuild it unless he asks.

Every footer carries a dim grey `.admin-link` in the bottom-right corner.

## 6. Known gotchas

- **Mobile nav breaks past four links.** There's a `@media(max-width:720px)` block that
  stacks the brand above centered links. Keep it in sync if you add a page.
- **Don't include `wrangler.jsonc` in a dashboard static upload.** It throws an upload
  error and greys out the Deploy button. It's CLI-only.
- **Cloudflare's dashboard menu paths change often.** Menu locations from a few weeks ago
  were already wrong mid-build. Verify against the actual screen.
- **The old about copy promised "one flat fee, no monthly charge."** That directly
  contradicts the hosting subscription. Never reintroduce it.
- After a DNS change, storefrontfix.com may show "can't find the server" for a while.
  That's propagation. It resolved on its own last time. Don't go fixing it.

## 7. Order 123 — the hosting system (BUILT, NOT YET WIRED UP)

**What it does.** Avery uploads a client's finished site at `/admin` under a code he picks
(e.g. `maple-street`). The client goes to `/hosting`, types the code, and their site opens
full-screen with zero StoreFrontFix branding. Or Avery sends
`storefrontfix.com/hosting?code=maple-street` so they skip the typing.
The code `demo` loads a built-in offline sample auto shop and works right now with no backend.

**Worker API contract** (worker/worker.js, ~190 lines):

| Route | Does |
|---|---|
| `POST /api/upload` | one file per call, writes to R2 |
| `GET /api/list` | lists uploaded client sites |
| `POST /api/delete` | removes a client site |
| `GET /sites/...` | serves a client site out of R2 |

Everything else on the domain falls through to the static site.
Auth is a constant-time compare of an `x-admin-key` header against the `ADMIN_KEY` secret.
Codes are lowercased and stripped to `[a-z0-9-]`, max 60 chars; paths are stripped of
`..` and `.` segments. That's what stops anyone writing outside their own folder.

**Remaining setup steps, in order:**

1. Pick an admin key, 20+ chars. Write it down — Cloudflare won't show it again.
2. Storage & databases → **R2 Object Storage** (not R2 SQL) → create bucket named exactly
   `storefrontfix-sites`. Not public. Card required for verification; free to 10 GB.
3. Compute → Workers and Pages → Create → Start with Hello World → name it
   `storefrontfix-uploader` → Deploy.
4. Edit code → delete everything → paste `worker/worker.js` → Deploy.
5. Settings → Bindings → Add → R2 bucket. Variable name `SITES` (capitals),
   bucket `storefrontfix-sites`.
6. Settings → Variables and Secrets → Add → type **Secret**, name `ADMIN_KEY`.
7. Settings → Domains and Routes → Add Route, zone storefrontfix.com, two routes:
   `storefrontfix.com/api/*` and `storefrontfix.com/sites/*`
8. Test: upload maple-street through `/admin`, then load it at `/hosting`.

He was at step 2 when the last session ended.

## 8. Stripe — done

Account label "Avery Wendell Ventures" (just a label, not a registered entity).
Legal business name: **Avery Hall**. Public name / statement descriptor: **Avery Hall**.

Why not "Storefront Fix": Minnesota requires a sole proprietorship operating under a name
that doesn't contain the proprietor's full name to file a Certificate of Assumed Name and
publish it in a qualified legal newspaper for two consecutive issues in the county
(Olmsted, for Byron). $30 by mail, $50 online, free annual renewal. He declined. Operating
as Avery Hall avoids the filing entirely. If he ever wants "Storefront Fix" on customer
statements, that filing is the prerequisite.

Business website field had to be entered as `https://www.storefrontfix.com` — the bare
domain got flagged Invalid.

Category: **Other business services** (under Professional Services).
Settings: Radar Standard ON ($0.05/screened txn). Tax calculation OFF. Climate OFF.
Managed Payments OFF (3.5% vs 2.9%). Stripe Billing OFF (+0.7%) — turn it on when the
first hosting customer signs, since Payment Links can't do recurring on their own.

Sales tax: nexus drives the obligation, not where the customer is. Economic nexus is
roughly $100k or 200 transactions per state. Not close yet.

**Payment links** (one-off, flat rate, USD, collecting customer + business name):

- $600 — https://buy.stripe.com/cNieVd8EO9IM9Q99XsgYU02
- $800 — https://buy.stripe.com/dRm9ATaMWbQU3rL3z4gYU01
- $1,200 — https://buy.stripe.com/8x25kD08ig7agex9XsgYU03

A $400 link exists but he dropped it. Payment Links cannot let the customer choose a price.

## 9. Open items

- Finish steps 2–8 above.
- Deploy the current build (pay page removed, admin footer link, zip upload support).
- Replace the maple-street example with a real client job once there is one.
- Connect this repo to Cloudflare so pushes auto-deploy and the zip-upload dance ends.

## 10. Secrets

Nothing sensitive is in this repo and it should stay that way.
`ADMIN_KEY` lives in Cloudflare as a secret. Not in code, not in `.env`, not in a commit.
