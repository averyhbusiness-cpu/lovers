# Order 123 — setup

One sitting, maybe forty minutes, most of it waiting. All of it in the
Cloudflare dashboard. No terminal, no installing anything.

When you're done: drag a client folder onto your own admin page, type a code,
hit upload. Live in seconds. From your phone.

---

## What you're building

Three pieces that already exist in this folder:

| Piece | What it does |
|---|---|
| **Pages project** | Serves storefrontfix.com. Drag-and-drop, same as Netlify. |
| **R2 bucket** | Where client sites are stored. |
| **Worker** | Catches `/api/*` and `/sites/*`. Handles uploads and serves client sites out of the bucket. |

Everything else on the domain goes to Pages like normal.

---

## 1. Account

cloudflare.com, sign up, free plan. It will ask for a card to enable R2 even
on the free tier. You are not charged unless you go past 10 GB of storage,
which is somewhere around a thousand client sites.

---

## 2. Domain

**Websites → Add a site → storefrontfix.com.**

Cloudflare gives you two nameservers. Go to wherever you bought the domain and
replace the nameservers there with those two. Takes anywhere from ten minutes
to a few hours to take effect. Start this first and do the rest while it goes
through.

---

## 3. The bucket

**R2 → Create bucket.** Name it `storefrontfix-sites`. Leave everything else
alone. Do **not** make it public — the Worker is what serves it.

---

## 4. The site

**Workers & Pages → Create → Pages → Upload assets.** Name it
`storefrontfix`. Drag the `site` folder in. Deploy.

Then **Custom domains → Set up a custom domain → storefrontfix.com.**

Your site is live at this point. The uploader is the next two steps.

---

## 5. The worker

**Workers & Pages → Create → Start with Hello World → Deploy.** Name it
`storefrontfix-uploader`.

Then **Edit code.** Delete what's in there. Open `worker/worker.js` from this
folder in any text editor, copy the whole thing, paste it in. **Deploy.**

### Bindings

**Settings → Bindings → Add → R2 bucket**
- Variable name: `SITES` (exactly that, capitals)
- Bucket: `storefrontfix-sites`

**Settings → Variables and Secrets → Add → Secret**
- Name: `ADMIN_KEY`
- Value: a long random password. Make it 20+ characters. This is the only
  thing standing between a stranger and your client sites.

Save it somewhere you won't lose it. A password manager, not a note app.

### Routes

**Settings → Domains & Routes → Add → Route.** Add two, both on zone
`storefrontfix.com`:

```
storefrontfix.com/api/*
storefrontfix.com/sites/*
```

These two paths now go to the Worker. Everything else keeps going to Pages.

---

## 6. Test it

Go to **storefrontfix.com/admin.html**. Enter your admin key.

Upload the example: drag the `sites/maple-street` folder onto the drop zone.
It will fill the code in as `maple-street` by itself. Hit upload.

Then go to **storefrontfix.com/hosting.html** and type `maple-street`. If the
auto shop site opens, you're done.

---

## Using it

1. I send you a client folder
2. Open storefrontfix.com/admin.html on your phone
3. Drag the folder in, or tap to pick the files
4. Type their code
5. Upload
6. Tell them: go to storefrontfix.com/hosting and type `their-code`

Uploading the same code again replaces what was there. That's how you send
them a revised version.

---

## Things worth knowing

**The admin key is the whole lock.** Anyone who has it can upload and delete.
Don't text it. Don't put it on a shared computer. If you think it got out,
change the secret in Cloudflare and it stops working immediately.

**The page is public, the key is not.** Somebody could find
storefrontfix.com/admin.html. Without the key it does nothing at all.

**Client sites are not private.** The code keeps them out of Google and out of
the way, but anyone who has a code can share it. Fine for showing a man his
own draft. Don't put anything in there you'd mind a stranger seeing.

**Phones.** Dragging a folder needs a computer. On a phone, tap the box and
pick the files — that works, and for a normal client site it's four or five
files sitting in one folder anyway.

**index.html is required.** If the homepage isn't named exactly that, the site
won't open. The admin page warns you before you upload.

**Deleting is instant and permanent.** Their link dies the moment you hit it.
Nothing is recoverable, so keep your own copy of every client folder.

---

## If something doesn't work

**"Could not reach the uploader"** — routes aren't live yet, or the Worker
didn't deploy. Check both routes are there and the Worker shows as deployed.

**"That key was not accepted"** — the secret is named something other than
`ADMIN_KEY`, or you're typing it wrong. It's case sensitive.

**Upload says "Missing or invalid code"** — the code has a character that
isn't a lowercase letter, number or dash.

**Site uploads but shows a blank page** — the CSS didn't come with it, or a
link starts with a slash. Every path inside a client site has to be relative:
`style.css`, never `/style.css`.

**Everything on the domain 404s** — a route is too broad. It should be
`storefrontfix.com/api/*` and `storefrontfix.com/sites/*`, nothing wider.
