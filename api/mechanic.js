/**
 * Mechanic AI worker — same Vercel project (grudge-dungeons).
 * GET  /api/mechanic  → health + ruleset stamp
 * POST /api/mechanic  { dungeon, linear } → compiled mechanics
 *
 * Does not simulate Rapier. Does not mint player bag/roster.
 * Agents: forge in the SPA (or pass a dungeon document), then POST here.
 */
import { compileMechanics, hydrateDungeon } from '../src/mechanic/compile.js';
import { DUNGEON_RULESET, RULESET_VERSION } from '../src/ruleset.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(res, status, body) {
  res.writeHead(status, CORS);
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  if (req.method === 'GET') {
    json(res, 200, {
      ok: true,
      worker: 'grudge-dungeon-mechanic',
      host: 'grudge-dungeons',
      version: RULESET_VERSION,
      schema: DUNGEON_RULESET.schema,
      mechanics: DUNGEON_RULESET.mechanics.map((m) => m.id),
      usage: 'POST { dungeon, linear } after a forge. Same seed ⇒ same colliders + stamps.',
    });
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'GET or POST' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};
  if (!body.dungeon && !req._rawConsumed) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (raw) {
      try { body = JSON.parse(raw); } catch { body = {}; }
    }
  }
  if (!body?.dungeon) {
    json(res, 400, {
      ok: false,
      error: 'dungeon document required — forge first, then POST serializeDungeon(d)',
    });
    return;
  }
  try {
    const mechanics = compileMechanics(hydrateDungeon(body.dungeon), { linear: body.linear !== false });
    json(res, mechanics.ok ? 200 : 422, mechanics);
  } catch (err) {
    json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}
