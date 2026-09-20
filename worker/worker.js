/* ===========================================================================
   STOREFRONT FIX — upload + hosting worker  (order 123)

   Handles three things and nothing else:
     POST /api/upload   receives one file, writes it to R2
     GET  /api/list     lists the client sites you have uploaded
     POST /api/delete   removes a client site
     GET  /sites/...    serves a client site out of R2

   Everything else on the domain falls through to your Pages site.

   BINDINGS THIS WORKER NEEDS (set in the Cloudflare dashboard):
     R2 bucket binding   named  SITES   pointing at your bucket
     Secret              named  ADMIN_KEY   a long random password you choose

   See SETUP-order-123.md for the click-by-click.
   =========================================================================== */

const TYPES = {
  html:"text/html; charset=utf-8", htm:"text/html; charset=utf-8",
  css:"text/css; charset=utf-8",   js:"text/javascript; charset=utf-8",
  json:"application/json",         svg:"image/svg+xml",
  png:"image/png",  jpg:"image/jpeg", jpeg:"image/jpeg",
  gif:"image/gif",  webp:"image/webp", avif:"image/avif",
  ico:"image/x-icon", pdf:"application/pdf",
  woff:"font/woff", woff2:"font/woff2", ttf:"font/ttf",
  mp4:"video/mp4",  webm:"video/webm", txt:"text/plain; charset=utf-8"
};

function typeFor(name){
  const ext = name.split(".").pop().toLowerCase();
  return TYPES[ext] || "application/octet-stream";
}

function json(data, status){
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type":"application/json; charset=utf-8" }
  });
}

/* codes are lowercase letters, numbers and dashes. nothing else gets through,
   which is what stops anyone writing outside their own folder. */
function cleanCode(v){
  return String(v || "").toLowerCase().trim()
    .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"").slice(0,60);
}

/* strip anything that could climb out of the folder */
function cleanPath(v){
  return String(v || "").replace(/\\/g,"/").split("/")
    .filter(seg => seg && seg !== "." && seg !== "..")
    .join("/").slice(0,200);
}

function authed(request, env){
  const given = request.headers.get("x-admin-key") || "";
  const want  = env.ADMIN_KEY || "";
  if (!want || given.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= given.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

async function keysUnder(env, prefix){
  const out = [];
  let cursor;
  do {
    const page = await env.SITES.list({ prefix, cursor, limit: 1000 });
    for (const o of page.objects) out.push(o);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out;
}

/* --------------------------------------------------------------- upload  */
async function upload(request, env){
  if (!authed(request, env)) return json({ error:"Wrong admin key" }, 401);

  const form = await request.formData();
  const code = cleanCode(form.get("code"));
  const file = form.get("file");
  const path = cleanPath(form.get("path") || (file && file.name));

  if (!code)  return json({ error:"Missing or invalid code" }, 400);
  if (!file || typeof file === "string") return json({ error:"No file" }, 400);
  if (!path)  return json({ error:"Bad file name" }, 400);

  /* first file of an upload clears whatever was there before */
  if (form.get("replace") === "yes") {
    const old = await keysUnder(env, `sites/${code}/`);
    for (const o of old) await env.SITES.delete(o.key);
  }

  const key = `sites/${code}/${path}`;
  await env.SITES.put(key, file.stream(), {
    httpMetadata: { contentType: typeFor(path) }
  });

  return json({ ok:true, key, size:file.size });
}

/* ----------------------------------------------------------------- list  */
async function list(request, env){
  if (!authed(request, env)) return json({ error:"Wrong admin key" }, 401);

  const objects = await keysUnder(env, "sites/");
  const sites = {};
  for (const o of objects){
    const code = o.key.split("/")[1];
    if (!code) continue;
    if (!sites[code]) sites[code] = { code, files:0, bytes:0, updated:null, hasIndex:false };
    const s = sites[code];
    s.files++;
    s.bytes += o.size;
    if (o.key === `sites/${code}/index.html`) s.hasIndex = true;
    const when = o.uploaded instanceof Date ? o.uploaded.toISOString() : o.uploaded;
    if (!s.updated || when > s.updated) s.updated = when;
  }
  return json({ sites: Object.values(sites).sort((a,b)=> a.code < b.code ? -1 : 1) });
}

/* --------------------------------------------------------------- delete  */
async function remove(request, env){
  if (!authed(request, env)) return json({ error:"Wrong admin key" }, 401);

  const body = await request.json().catch(()=> ({}));
  const code = cleanCode(body.code);
  if (!code) return json({ error:"Missing code" }, 400);

  const objects = await keysUnder(env, `sites/${code}/`);
  for (const o of objects) await env.SITES.delete(o.key);
  return json({ ok:true, removed: objects.length });
}

/* ------------------------------------------------- serve a client site  */
async function serve(request, env, pathname){
  let key;
  try { key = decodeURIComponent(pathname).replace(/^\/+/, ""); }
  catch { return new Response("Bad request", { status:400 }); }

  if (key.includes("..")) return new Response("Not found", { status:404 });

  /* /sites/code  ->  /sites/code/ */
  const parts = key.split("/");
  if (parts.length === 2 && parts[1]) {
    return Response.redirect(new URL(pathname + "/", request.url).toString(), 301);
  }

  const tryKeys = key.endsWith("/") ? [key + "index.html"]
                : key.split("/").pop().includes(".") ? [key]
                : [key, key + "/index.html"];

  for (const k of tryKeys){
    const obj = await env.SITES.get(k);
    if (obj){
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      if (!headers.get("content-type")) headers.set("content-type", typeFor(k));
      headers.set("cache-control", "public, max-age=60");
      headers.set("x-robots-tag", "noindex, nofollow");
      return new Response(obj.body, { headers });
    }
  }
  return new Response("No site found for that code.", {
    status: 404,
    headers: { "content-type":"text/plain; charset=utf-8", "x-robots-tag":"noindex" }
  });
}

/* ----------------------------------------------------------------- main  */
export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const p = url.pathname;

    try {
      if (p === "/api/upload" && request.method === "POST") return await upload(request, env);
      if (p === "/api/list"   && request.method === "GET")  return await list(request, env);
      if (p === "/api/delete" && request.method === "POST") return await remove(request, env);
      if (p === "/sites" || p.startsWith("/sites/"))        return await serve(request, env, p);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 500);
    }

    /* not ours — let the rest of the site handle it */
    return fetch(request);
  }
};
