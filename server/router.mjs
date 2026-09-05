/**
 * Dungeon Node API — mechanic compile, AI script, completion stamp.
 * Used by `npm start` and Vite middleware. Vercel also hosts the same handlers
 * under /api. No new public host.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mechanic from '../api/mechanic.js';
import { compileDungeonScript, hydrateDungeon } from '../src/mechanic/compile.js';
import { DUNGEON_RULESET, RULESET_VERSION } from '../src/ruleset.js';
import { CORS, json, readJsonBody } from './http.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function pathnameOf(req) {
  try {
    return new URL(req.url, 'http://localhost').pathname;
  } catch {
    return req.url?.split('?')[0] || '/';
  }
}

export async function routeDungeonApi(req, res) {
  const path = pathnameOf(req);
  if (req.method === 'OPTIONS' && path.startsWith('/api')) {
    res.writeHead(204, CORS);
    res.end();
    return true;
  }
  if (path === '/health' || path === '/api/health') {
    json(res, 200, {
      ok: true,
      worker: 'grudge-dungeon-node',
      version: RULESET_VERSION,
      schema: DUNGEON_RULESET.schema,
      completeOn: DUNGEON_RULESET.complete?.on,
      routes: ['/api/mechanic', '/api/dungeon/script', '/api/dungeon/complete', '/api/health'],
    });
    return true;
  }
  if (path === '/api/mechanic') {
    await mechanic(req, res);
    return true;
  }
  if (path === '/api/dungeon/script' || path === '/api/dungeon-script') {
    await handleScript(req, res);
    return true;
  }
  if (path === '/api/dungeon/complete' || path === '/api/dungeon-complete') {
    await handleComplete(req, res);
    return true;
  }
  if (path === '/api/v1/dungeon-play-contract.json') {
    const file = resolve(root, 'public/api/v1/dungeon-play-contract.json');
    json(res, 200, JSON.parse(readFileSync(file, 'utf8')));
    return true;
  }
  return false;
}

export async function handleScript(req, res) {
  if (req.method === 'GET') {
    json(res, 200, {
      ok: true,
      worker: 'grudge-dungeon-script',
      version: RULESET_VERSION,
      usage: 'POST { dungeon, linear, kindId } after a forge. Returns events + bosses + terrain + completeOn.',
    });
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'GET or POST' });
    return;
  }
  const body = await readJsonBody(req);
  if (!body?.dungeon) {
    json(res, 400, { ok: false, error: 'dungeon document required' });
    return;
  }
  try {
    const script = compileDungeonScript(hydrateDungeon(body.dungeon), {
      linear: body.linear !== false,
      kindId: body.kindId,
      kind: body.kind,
      playerRace: body.playerRace,
    });
    json(res, script.ok ? 200 : 422, script);
  } catch (err) {
    json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}

export async function handleComplete(req, res) {
  if (req.method === 'GET') {
    json(res, 200, {
      ok: true,
      worker: 'grudge-dungeon-complete',
      completeOn: DUNGEON_RULESET.complete?.on,
      pass: DUNGEON_RULESET.complete?.pass,
      usage: 'POST { win, seed, instanceId, characterId, pass } — Node stamps the pass. Railway dungeon_runs is recorded on grudgewarlords.com/home return.',
    });
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'GET or POST' });
    return;
  }
  const body = await readJsonBody(req);
  const win = body.win !== false;
  const pass = win ? (body.pass || DUNGEON_RULESET.complete.pass) : (body.pass || 'wipe');
  const recorded = {
    schema: 'grudge.dungeon.complete/v1',
    ok: true,
    recorded: 'node',
    win,
    pass,
    completeOn: DUNGEON_RULESET.complete.on,
    seed: body.seed ?? null,
    instanceId: body.instanceId || null,
    characterId: body.characterId || null,
    era: body.era || 'warlords',
    theme: body.theme || null,
    host: body.host || 'grudge-dungeons',
    at: Date.now(),
  };
  const returnTo = body.characterId || body.from === 'home'
    ? `https://grudgewarlords.com/home?era=warlords&from=dungeon&dungeonComplete=${win ? '1' : '0'}&pass=${encodeURIComponent(pass)}${body.characterId ? `&characterId=${encodeURIComponent(body.characterId)}` : ''}${body.seed != null ? `&seed=${encodeURIComponent(String(body.seed))}` : ''}${body.instanceId ? `&instanceId=${encodeURIComponent(body.instanceId)}` : ''}`
    : null;
  json(res, 200, { ...recorded, returnTo });
}
