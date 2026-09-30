/* ==========================================================================
   Klever department reports — API (Cloudflare Worker + D1)
   Shared records for the department report pages (commercial, purchasing).
   There is no login: each department's link carries a secret code
   (?k=...). Everyone with the full link sees and edits the same records;
   without the code nothing can be read or changed. Only a hash of each
   code is stored (table link_keys).
   ========================================================================== */

const DEPTS = {
  commercial: { label: "Commercial", datasets: ["leads", "measurements", "payments", "expAdvance", "expFinal", "problems", "social", "production"] },
  purchasing: { label: "Purchasing", datasets: ["requests", "cheques", "materials", "suppliers", "ledger", "jobs", "issues", "cashNeeds", "summaries", "sent"] },
};
const ALLOWED_ORIGINS = ["https://ewkena2-ops.github.io"];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const RID_RE = /^[A-Za-z0-9._:-]{1,80}$/;

const enc = new TextEncoder();
const httpErr = (status, message) => Object.assign(new Error(message), { status, expose: true });
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const sha256 = async (s) => b64u(await crypto.subtle.digest("SHA-256", enc.encode(s)));

function corsHeaders(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin);
  return ok ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "86400", Vary: "Origin" } : { Vary: "Origin" };
}
function withCors(res, cors) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
  return out;
}

const first = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const all = async (env, sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results || [];

// The request must carry this department's link code: "Authorization: Key <code>"
async function checkKey(req, env, dept) {
  const h = req.headers.get("Authorization") || "";
  const key = h.startsWith("Key ") ? h.slice(4).trim() : "";
  const row = key && (await first(env, "SELECT dept FROM link_keys WHERE key_hash = ?", await sha256(key)));
  if (!row || row.dept !== dept) throw httpErr(401, "This link's code is missing or not valid. Open the report with the full link you were sent.");
}

async function currentRev(env) { return (await first(env, "SELECT v FROM meta WHERE k = 'rev'")).v; }
async function getData(env, dept) {
  const rev = await currentRev(env);
  const records = await all(env, "SELECT dataset, rid, data FROM records WHERE dept = ? AND deleted = 0 ORDER BY dataset, rid", dept);
  const s = await first(env, "SELECT data FROM settings WHERE dept = ?", dept);
  return { rev, records: records.map((r) => ({ dataset: r.dataset, rid: r.rid, data: JSON.parse(r.data) })), settings: s ? JSON.parse(s.data) : null };
}
async function getChanges(env, dept, since) {
  const rev = await currentRev(env);
  const records = await all(env, "SELECT dataset, rid, data, deleted, rev FROM records WHERE dept = ? AND rev > ? ORDER BY rev LIMIT 2000", dept, since);
  const s = await first(env, "SELECT data FROM settings WHERE dept = ? AND rev > ?", dept, since);
  const more = records.length === 2000;
  return { rev: more ? records[records.length - 1].rev : rev, more, records: records.map((r) => ({ dataset: r.dataset, rid: r.rid, deleted: !!r.deleted, data: r.deleted ? null : JSON.parse(r.data) })), settings: s ? JSON.parse(s.data) : null };
}
async function sync(env, dept, body) {
  const sets = DEPTS[dept].datasets;
  const ups = Array.isArray(body.upserts) ? body.upserts : [], dels = Array.isArray(body.deletes) ? body.deletes : [];
  if (ups.length + dels.length > 300) throw httpErr(413, "Too many changes in one request.");
  for (const u of ups) if (!sets.includes(u.dataset) || !RID_RE.test(String(u.rid || "")) || !u.data || typeof u.data !== "object" || Array.isArray(u.data)) throw httpErr(400, "A record is not valid.");
  for (const d of dels) if (!sets.includes(d.dataset) || !RID_RE.test(String(d.rid || ""))) throw httpErr(400, "A delete is not valid.");
  const now = new Date().toISOString(), stmts = [];
  const bump = () => env.DB.prepare("UPDATE meta SET v = v + 1 WHERE k = 'rev'");
  for (const u of ups) {
    const data = JSON.stringify({ ...u.data, id: String(u.rid) });
    if (data.length > 50000) throw httpErr(413, "A record is too large.");
    stmts.push(bump(), env.DB.prepare(`INSERT INTO records (dept, dataset, rid, data, deleted, rev, updated_at)
      VALUES (?, ?, ?, ?, 0, (SELECT v FROM meta WHERE k = 'rev'), ?)
      ON CONFLICT(dept, dataset, rid) DO UPDATE SET data = excluded.data, deleted = 0, rev = excluded.rev, updated_at = excluded.updated_at`)
      .bind(dept, u.dataset, String(u.rid), data, now));
  }
  for (const d of dels) {
    stmts.push(bump(), env.DB.prepare("UPDATE records SET deleted = 1, rev = (SELECT v FROM meta WHERE k = 'rev'), updated_at = ? WHERE dept = ? AND dataset = ? AND rid = ?").bind(now, dept, d.dataset, String(d.rid)));
  }
  if (body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)) {
    const data = JSON.stringify(body.settings);
    if (data.length > 50000) throw httpErr(413, "Settings are too large.");
    stmts.push(bump(), env.DB.prepare(`INSERT INTO settings (dept, data, rev, updated_at) VALUES (?, ?, (SELECT v FROM meta WHERE k = 'rev'), ?)
      ON CONFLICT(dept) DO UPDATE SET data = excluded.data, rev = excluded.rev, updated_at = excluded.updated_at`).bind(dept, data, now));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return { ok: true };
}

async function route(req, env, url) {
  const p = url.pathname.replace(/\/+$/, "");
  if (p === "" || p === "/api" || p === "/api/health") return json({ ok: true, service: "klever-reports", departments: Object.keys(DEPTS) });
  const m = p.match(/^\/api\/([a-z]+)(\/.*)$/);
  if (!m || !DEPTS[m[1]]) throw httpErr(404, "Not found");
  const dept = m[1], a = m[2];
  await checkKey(req, env, dept);
  if (req.method === "GET" && a === "/data") return json(await getData(env, dept));
  if (req.method === "GET" && a === "/changes") return json(await getChanges(env, dept, Number(url.searchParams.get("since")) || 0));
  if (req.method === "POST" && a === "/sync") return json(await sync(env, dept, await req.json().catch(() => ({}))));
  throw httpErr(404, "Not found");
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req.headers.get("Origin") || "");
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      return withCors(await route(req, env, new URL(req.url)), cors);
    } catch (e) {
      if (!e.expose) console.error(e && e.stack ? e.stack : e);
      return withCors(json({ error: e.expose ? e.message : "Server error. Please try again." }, e.status || 500), cors);
    }
  },
};
