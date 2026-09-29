/* ==========================================================================
   Klever department reports — API (Cloudflare Worker + D1)
   Shared login and shared records for the department report pages
   (commercial, purchasing). Every department has its own team and data.
     owner  : sees and edits everything in the department, manages access
     editor : enters and edits the department's data and settings
     viewer : sees the report and data, cannot change anything
   One account (email + password) works on every department page the
   person has access to.
   ========================================================================== */

const DEPTS = {
  commercial: { label: "Commercial", datasets: ["leads", "measurements", "payments", "expAdvance", "expFinal", "problems", "social"] },
  purchasing: { label: "Purchasing", datasets: ["requests", "cheques", "materials", "suppliers", "ledger", "jobs", "issues", "cashNeeds", "summaries", "sent"] },
};
const ROLES = ["owner", "editor", "viewer"];
const ALLOWED_ORIGINS = ["https://ewkena2-ops.github.io"];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const SESSION_MS = 30 * 24 * 3600 * 1000;
const PBKDF2_ITER = 10000; // kept low enough for the Workers free CPU limit; logins are rate limited
const MAX_FAILS = 8, FAIL_WINDOW = 15 * 60 * 1000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RID_RE = /^[A-Za-z0-9._:-]{1,80}$/;

const enc = new TextEncoder();
const httpErr = (status, message) => Object.assign(new Error(message), { status, expose: true });
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const sha256 = async (s) => b64u(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const cleanEmail = (e) => String(e || "").trim().toLowerCase();

async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256);
  return `pbkdf2$${PBKDF2_ITER}$${b64u(salt)}$${b64u(bits)}`;
}
async function verifyPassword(pw, stored) {
  const [kind, iter, saltS, hashS] = String(stored || "").split("$");
  if (kind !== "pbkdf2") return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromB64u(saltS), iterations: Number(iter) }, key, 256));
  const want = fromB64u(hashS);
  if (bits.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ want[i];
  return diff === 0;
}

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

async function newSession(env, email) {
  const token = b64u(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires < ?").bind(Date.now()),
    env.DB.prepare("INSERT INTO sessions (token_hash, email, expires) VALUES (?, ?, ?)").bind(await sha256(token), email, Date.now() + SESSION_MS),
  ]);
  return token;
}
async function meFromEmail(env, dept, email) {
  const user = await first(env, "SELECT name FROM users WHERE email = ?", email);
  const member = await first(env, "SELECT role, name FROM members WHERE dept = ? AND email = ?", dept, email);
  const owner = await first(env, "SELECT 1 AS x FROM members WHERE dept = ? AND role = 'owner' LIMIT 1", dept);
  return { email, name: (member && member.name) || (user && user.name) || "", role: member ? member.role : null, hasOwner: !!owner, dept };
}
async function auth(req, env, dept) {
  const h = req.headers.get("Authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) throw httpErr(401, "Not signed in");
  const s = await first(env, "SELECT email, expires FROM sessions WHERE token_hash = ?", await sha256(token));
  if (!s || s.expires < Date.now()) throw httpErr(401, "Session ended. Please sign in again.");
  return { token, ...(await meFromEmail(env, dept, s.email)) };
}
const needRole = (me, roles) => { if (!me.role || (roles && !roles.includes(me.role))) throw httpErr(403, "You do not have access to this."); };
const canWrite = (role) => role === "owner" || role === "editor";
const publicMe = (me) => ({ email: me.email, name: me.name, role: me.role, hasOwner: me.hasOwner });

/* ---------- routes ---------- */
async function signup(env, dept, body) {
  const email = cleanEmail(body.email), pw = String(body.password || ""), name = String(body.name || "").trim().slice(0, 80);
  if (!EMAIL_RE.test(email)) throw httpErr(400, "Type a valid email address.");
  if (pw.length < 8) throw httpErr(400, "Choose a password of at least 8 characters.");
  // Only the first account of a department (before it has an owner) is created here; the owner makes every other login
  const owner = await first(env, "SELECT 1 AS x FROM members WHERE dept = ? AND role = 'owner' LIMIT 1", dept);
  if (owner) throw httpErr(403, "Logins are made by the owner in Team & access.");
  if (await first(env, "SELECT 1 AS x FROM users WHERE email = ?", email)) throw httpErr(409, "An account with this email already exists. Sign in instead.");
  await env.DB.prepare("INSERT INTO users (email, name, pass, created_at) VALUES (?, ?, ?, ?)").bind(email, name || null, await hashPassword(pw), new Date().toISOString()).run();
  return { token: await newSession(env, email), me: publicMe(await meFromEmail(env, dept, email)) };
}
async function login(env, dept, body) {
  const email = cleanEmail(body.email), pw = String(body.password || "");
  const a = await first(env, "SELECT fails, since FROM attempts WHERE email = ?", email);
  if (a && Date.now() - a.since < FAIL_WINDOW && a.fails >= MAX_FAILS) throw httpErr(429, "Too many wrong passwords. Wait 15 minutes and try again.");
  const user = await first(env, "SELECT pass FROM users WHERE email = ?", email);
  if (!user || !(await verifyPassword(pw, user.pass))) {
    const fresh = !a || Date.now() - a.since >= FAIL_WINDOW;
    await env.DB.prepare("INSERT INTO attempts (email, fails, since) VALUES (?, 1, ?) ON CONFLICT(email) DO UPDATE SET fails = CASE WHEN ? THEN 1 ELSE fails + 1 END, since = CASE WHEN ? THEN excluded.since ELSE since END")
      .bind(email, Date.now(), fresh ? 1 : 0, fresh ? 1 : 0).run();
    throw httpErr(401, "Wrong email or password.");
  }
  await env.DB.prepare("DELETE FROM attempts WHERE email = ?").bind(email).run();
  return { token: await newSession(env, email), me: publicMe(await meFromEmail(env, dept, email)) };
}
async function changePassword(env, me, body) {
  const user = await first(env, "SELECT pass FROM users WHERE email = ?", me.email);
  if (!user || !(await verifyPassword(String(body.current || ""), user.pass))) throw httpErr(400, "The current password is wrong.");
  const next = String(body.next || "");
  if (next.length < 8) throw httpErr(400, "Choose a password of at least 8 characters.");
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pass = ? WHERE email = ?").bind(await hashPassword(next), me.email),
    env.DB.prepare("DELETE FROM sessions WHERE email = ? AND token_hash != ?").bind(me.email, await sha256(me.token)),
  ]);
  return { ok: true };
}
async function claimOwner(env, dept, me, body) {
  const name = String(body.name || "").trim().slice(0, 80) || me.name || me.email;
  const r = await env.DB.prepare("INSERT INTO members (dept, email, name, role, created_at) SELECT ?, ?, ?, 'owner', ? WHERE NOT EXISTS (SELECT 1 FROM members WHERE dept = ? AND role = 'owner') ON CONFLICT(dept, email) DO UPDATE SET role = 'owner', name = excluded.name")
    .bind(dept, me.email, name, new Date().toISOString(), dept).run();
  if (!r.meta || !r.meta.changes) throw httpErr(409, "This department already has an owner.");
  return { me: publicMe(await meFromEmail(env, dept, me.email)) };
}
async function currentRev(env) { return (await first(env, "SELECT v FROM meta WHERE k = 'rev'")).v; }
async function getData(env, dept, me) {
  needRole(me);
  const rev = await currentRev(env);
  const records = await all(env, "SELECT dataset, rid, data FROM records WHERE dept = ? AND deleted = 0 ORDER BY dataset, rid", dept);
  const s = await first(env, "SELECT data FROM settings WHERE dept = ?", dept);
  return { rev, records: records.map((r) => ({ dataset: r.dataset, rid: r.rid, data: JSON.parse(r.data) })), settings: s ? JSON.parse(s.data) : null };
}
async function getChanges(env, dept, me, since) {
  needRole(me);
  const rev = await currentRev(env);
  const records = await all(env, "SELECT dataset, rid, data, deleted, rev FROM records WHERE dept = ? AND rev > ? ORDER BY rev LIMIT 2000", dept, since);
  const s = await first(env, "SELECT data FROM settings WHERE dept = ? AND rev > ?", dept, since);
  const more = records.length === 2000;
  return { rev: more ? records[records.length - 1].rev : rev, more, records: records.map((r) => ({ dataset: r.dataset, rid: r.rid, deleted: !!r.deleted, data: r.deleted ? null : JSON.parse(r.data) })), settings: s ? JSON.parse(s.data) : null };
}
async function sync(env, dept, me, body) {
  needRole(me);
  if (!canWrite(me.role)) throw httpErr(403, "You can view this report but not change it.");
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
    stmts.push(bump(), env.DB.prepare(`INSERT INTO records (dept, dataset, rid, data, deleted, rev, updated_at, updated_by)
      VALUES (?, ?, ?, ?, 0, (SELECT v FROM meta WHERE k = 'rev'), ?, ?)
      ON CONFLICT(dept, dataset, rid) DO UPDATE SET data = excluded.data, deleted = 0, rev = excluded.rev, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(dept, u.dataset, String(u.rid), data, now, me.email));
  }
  for (const d of dels) {
    stmts.push(bump(), env.DB.prepare("UPDATE records SET deleted = 1, rev = (SELECT v FROM meta WHERE k = 'rev'), updated_at = ?, updated_by = ? WHERE dept = ? AND dataset = ? AND rid = ?").bind(now, me.email, dept, d.dataset, String(d.rid)));
  }
  if (body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)) {
    const data = JSON.stringify(body.settings);
    if (data.length > 50000) throw httpErr(413, "Settings are too large.");
    stmts.push(bump(), env.DB.prepare(`INSERT INTO settings (dept, data, rev, updated_at, updated_by) VALUES (?, ?, (SELECT v FROM meta WHERE k = 'rev'), ?, ?)
      ON CONFLICT(dept) DO UPDATE SET data = excluded.data, rev = excluded.rev, updated_at = excluded.updated_at, updated_by = excluded.updated_by`).bind(dept, data, now, me.email));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return { ok: true };
}
async function setPassword(env, email, pw, name) {
  if (pw.length < 8) throw httpErr(400, "Choose a password of at least 8 characters.");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (email, name, pass, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET pass = excluded.pass")
      .bind(email, name || null, await hashPassword(pw), new Date().toISOString()),
    env.DB.prepare("DELETE FROM sessions WHERE email = ?").bind(email),
    env.DB.prepare("DELETE FROM attempts WHERE email = ?").bind(email),
  ]);
}
// The password is shared by every department page, so an owner cannot set another owner's password.
async function checkCanSetPassword(env, me, email) {
  if (email === me.email) throw httpErr(400, "Change your own password with the Password button.");
  if (await first(env, "SELECT 1 AS x FROM members WHERE email = ? AND role = 'owner' LIMIT 1", email)) throw httpErr(403, "This person is an owner. They change their own password with the Password button.");
}
async function members(env, dept, me, action, body) {
  needRole(me, ["owner"]);
  if (action === "list") {
    const rows = await all(env, `SELECT m.email, m.name, m.role, CASE WHEN u.email IS NULL THEN 0 ELSE 1 END AS has_account FROM members m LEFT JOIN users u ON u.email = m.email
      WHERE m.dept = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, m.email`, dept);
    return { members: rows.map((r) => ({ email: r.email, name: r.name, role: r.role, hasAccount: !!r.has_account })) };
  }
  const email = cleanEmail(body.email);
  if (!EMAIL_RE.test(email)) throw httpErr(400, "Type a valid email address.");
  if (action === "save") {
    const role = String(body.role || "");
    if (!ROLES.includes(role)) throw httpErr(400, "Choose a role.");
    if (email === me.email && role !== "owner") throw httpErr(400, "You cannot remove your own owner access.");
    const name = String(body.name || "").trim().slice(0, 80) || null, pw = body.password == null ? "" : String(body.password);
    if (pw) {
      if (pw.length < 8) throw httpErr(400, "Choose a password of at least 8 characters.");
      await checkCanSetPassword(env, me, email);
    }
    await env.DB.prepare("INSERT INTO members (dept, email, name, role, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(dept, email) DO UPDATE SET role = excluded.role, name = COALESCE(excluded.name, members.name)")
      .bind(dept, email, name, role, new Date().toISOString()).run();
    if (pw) await setPassword(env, email, pw, name);
    return { ok: true };
  }
  if (action === "delete") {
    if (email === me.email) throw httpErr(400, "You cannot remove yourself.");
    // The login itself is removed only when the person has no other department left
    await env.DB.batch([
      env.DB.prepare("DELETE FROM members WHERE dept = ? AND email = ?").bind(dept, email),
      ...["users", "sessions", "attempts"].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE email = ? AND NOT EXISTS (SELECT 1 FROM members WHERE email = ?)`).bind(email, email)),
    ]);
    return { ok: true };
  }
  if (action === "password") {
    const member = await first(env, "SELECT name FROM members WHERE dept = ? AND email = ?", dept, email);
    if (!member) throw httpErr(404, "This person is not in your team.");
    await checkCanSetPassword(env, me, email);
    await setPassword(env, email, String(body.password || ""), member.name);
    return { ok: true };
  }
  throw httpErr(404, "Unknown action.");
}

async function route(req, env, url) {
  const p = url.pathname.replace(/\/+$/, "");
  if (p === "" || p === "/api" || p === "/api/health") return json({ ok: true, service: "klever-reports", departments: Object.keys(DEPTS) });
  const m = p.match(/^\/api\/([a-z]+)(\/.*)$/);
  if (!m || !DEPTS[m[1]]) throw httpErr(404, "Not found");
  const dept = m[1], a = m[2];
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  if (req.method === "POST" && a === "/signup") return json(await signup(env, dept, body));
  if (req.method === "POST" && a === "/login") return json(await login(env, dept, body));
  const me = await auth(req, env, dept);
  if (req.method === "GET" && a === "/me") return json({ me: publicMe(me) });
  if (req.method === "POST" && a === "/logout") { await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(me.token)).run(); return json({ ok: true }); }
  if (req.method === "POST" && a === "/password") return json(await changePassword(env, me, body));
  if (req.method === "POST" && a === "/claim-owner") return json(await claimOwner(env, dept, me, body));
  if (req.method === "GET" && a === "/data") return json(await getData(env, dept, me));
  if (req.method === "GET" && a === "/changes") return json(await getChanges(env, dept, me, Number(url.searchParams.get("since")) || 0));
  if (req.method === "POST" && a === "/sync") return json(await sync(env, dept, me, body));
  if (req.method === "GET" && a === "/members") return json(await members(env, dept, me, "list", {}));
  if (req.method === "POST" && a === "/members") return json(await members(env, dept, me, "save", body));
  if (req.method === "POST" && a === "/members/delete") return json(await members(env, dept, me, "delete", body));
  if (req.method === "POST" && a === "/members/password") return json(await members(env, dept, me, "password", body));
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
