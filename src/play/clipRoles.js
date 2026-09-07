/**
 * Dungeon TPS clip SSOT — names from the combat donor, not a second mixer.
 *
 * Controller stays Rapier CCT + PlayTpsCamera + one AnimationMixer per Actor.
 * Harvest only: locomotion set swap, overlay one-shots, hit window on clip time.
 * Do not add `three-player-controller` as a package.
 *
 * Donor: combat.grudge-studio.com/models/toon-clips/wk-knight.glb (55 clips).
 * Wire a role only when the stem exists and maps to that role. Skip unused
 * (swim / fishing / wall / stairs / torch / cover) and never steal them as hit.
 */

/** Exact animation names in wk-knight.glb, file order. Duplicate idle/run kept once. */
export const CLIP_DONOR_NAMES = [
  'idle', 'walk', 'run', 'attack', 'sprint',
  'strafe_left', 'strafe_right', 'strafe_left_walk', 'strafe_right_walk',
  'turn_left', 'turn_right', 'jump', 'front_flip',
  'sneak_l', 'sneak_r', 'cover_sneak_l', 'cover_sneak_r',
  'stand_to_cover', 'cover_to_stand', 'crouch_idle',
  'ascend_stairs', 'swim', 'gs_idle', 'gs_walk', 'gs_run',
  'climb_ladder', 'climbup_1m', 'wall_jump_start', 'wall_grab', 'wall_jump_land',
  'slide_start', 'slide_exit', 'crawl', 'harvest', 'plant_seed',
  'unarmed_uppercut', 'sword_attack_a', 'sword_attack_c', 'sword_combo_finisher',
  'sword_block', 'sword_dash_attack', 'shield_bash',
  'dodge', 'aerial_evade', 'sprint_start', 'descend_stairs',
  'torch_run', 'torch_run_stop', 'wall_run', 'wall_climb',
  'run_jump_attack', 'fishing_cast', 'fishing_idle',
];

/** Present on the donor but not a dungeon play role (do not regex-steal). */
export const CLIP_SKIP = [
  'swim', 'fishing_cast', 'fishing_idle',
  'climb_ladder', 'climbup_1m',
  'wall_jump_start', 'wall_grab', 'wall_jump_land', 'wall_run', 'wall_climb',
  'ascend_stairs', 'descend_stairs',
  'torch_run', 'torch_run_stop',
  'stand_to_cover', 'cover_to_stand', 'cover_sneak_l', 'cover_sneak_r',
  'turn_left', 'turn_right',
];

export const LOCO_KEYS = ['idle', 'walk', 'run', 'sprint', 'crawl', 'sneak', 'crouch', 'strafeL', 'strafeR'];

/** Overlay / one-shot roles the Actor may play. */
export const SHOT_KEYS = [
  'attack', 'attack2', 'attack3', 'cast', 'shoot', 'dashAtk', 'jumpAtk',
  'dodge', 'evade', 'flip', 'slide', 'slideExit', 'jump',
  'block', 'parry', 'bash', 'uppercut',
  'hit', 'stun', 'death', 'interact', 'plant',
];

/**
 * If the requested role is missing, try the next unique role.
 * `hit` / `stun` never fall back to `attack` (that was the broken flinch).
 */
export const CLIP_FALLBACK = {
  attack: ['attack', 'attack2'],
  attack2: ['attack2', 'attack'],
  attack3: ['attack3', 'attack2', 'attack'],
  cast: ['cast', 'skill1', 'attack1', 'attack'],
  shoot: ['shoot', 'cast', 'attack'],
  dashAtk: ['dashAtk', 'jumpAtk', 'attack'],
  jumpAtk: ['jumpAtk', 'dashAtk', 'attack'],
  dodge: ['dodge', 'evade', 'flip', 'slide'],
  evade: ['evade', 'dodge'],
  flip: ['flip', 'dodge'],
  parry: ['parry', 'bash', 'block'],
  bash: ['bash', 'parry', 'attack'],
  block: ['block', 'parry'],
  hit: ['hit', 'stun'],
  stun: ['stun', 'verigo', 'hit', 'crouch'],
  jump: ['jump', 'flip'],
  slide: ['slide', 'dodge'],
  slideExit: ['slideExit'],
  death: ['death', 'dead', 'die'],
  interact: ['interact', 'plant', 'cast'],
  plant: ['plant', 'interact'],
  uppercut: ['uppercut', 'attack'],
  crawl: ['crawl', 'crouch', 'walk'],
  sneak: ['sneak', 'crouch', 'walk'],
  crouch: ['crouch', 'idle'],
  sprint: ['sprint', 'run'],
  walk: ['walk', 'run', 'idle'],
  run: ['run', 'sprint', 'walk'],
  idle: ['idle', 'walk'],
  strafeL: ['strafeL', 'walk'],
  strafeR: ['strafeR', 'walk'],
};

export function clipStem(name) {
  const raw = String(name || '');
  const part = raw.split('|').pop().trim();
  return part.replace(/^mixamorig:?/i, '').replace(/[\s-]+/g, '_');
}

function namedGet(named, ...keys) {
  for (const k of keys) {
    const c = named.get(String(k).toLowerCase());
    if (c) return c;
  }
  return null;
}

function firstHit(clips, re, skip) {
  for (const c of clips) {
    const s = clipStem(c.name);
    if (skip.has(s.toLowerCase())) continue;
    if (re.test(s) || re.test(c.name)) return c;
  }
  return null;
}

/**
 * Map donor + fallback GLB clips onto play roles.
 * weaponId picks greatsword loco / unarmed / bow-or-magic cast aliases.
 */
export function classifyClips(clips, weaponId = '') {
  const wep = String(weaponId || '');
  const bow = /bow|longbow|xbow|crossbow/.test(wep);
  const mag = /staff|wand|tome|magic/.test(wep);
  const twoH = /two_hand|greataxe|greatsword|gs_|hammer_holy|mace_sword/.test(wep);
  const unarmed = /unarmed|claw/.test(wep);
  const skip = new Set(CLIP_SKIP.map((n) => n.toLowerCase()));
  const named = new Map();
  for (const c of clips || []) {
    const s = clipStem(c.name);
    c.userData = c.userData || {};
    c.userData.stem = s;
    const key = s.toLowerCase();
    named.set(key, c);
  }
  const exact = (...keys) => namedGet(named, ...keys);
  const hit = (re) => firstHit(clips || [], re, skip);

  const out = {};
  for (const k of [...LOCO_KEYS, ...SHOT_KEYS]) out[k] = null;

  out.idle = twoH ? (exact('gs_idle') || exact('idle')) : exact('idle', 'stand', 'wait', 'stay_show', 'show', 'wait_inhand');
  out.walk = twoH ? (exact('gs_walk') || exact('walk')) : exact('walk', 'walk_inhand');
  out.run = twoH ? (exact('gs_run') || exact('run')) : exact('run');
  out.sprint = exact('sprint', 'sprint_start') || out.run;
  out.jump = exact('jump');
  out.flip = exact('front_flip');
  out.dodge = exact('dodge');
  out.evade = exact('aerial_evade');
  out.slide = exact('slide_start');
  out.slideExit = exact('slide_exit');
  out.crawl = exact('crawl');
  out.sneak = exact('sneak_l', 'sneak_r');
  out.crouch = exact('crouch_idle');
  out.strafeL = exact('strafe_left', 'strafe_left_walk');
  out.strafeR = exact('strafe_right', 'strafe_right_walk');
  out.block = exact('sword_block');
  out.parry = exact('shield_bash', 'sword_block');
  out.bash = exact('shield_bash');
  out.uppercut = exact('unarmed_uppercut');
  out.dashAtk = exact('sword_dash_attack');
  out.jumpAtk = exact('run_jump_attack');
  out.interact = exact('harvest');
  out.plant = exact('plant_seed');
  out.attack = unarmed
    ? (exact('unarmed_uppercut') || exact('sword_attack_a', 'attack'))
    : exact('sword_attack_a', 'attack', 'attack01', 'attack_1', 'commonattack', 'strike_1');
  out.attack2 = exact('sword_attack_c', 'attack_2', 'attack02', 'attack_3', 'skill2', 'attack2') || out.attack;
  out.attack3 = exact('sword_combo_finisher', 'skill3', 'skill_1') || out.attack2;
  out.cast = exact('cast', 'skill1', 'attack1', 'standing_1h_cast_spell_01', 'use_magic', 'use_skill', 'skill_ready', 'skill_1') || (mag ? (exact('attack') || out.attack) : out.attack);
  out.stun = exact('stun', 'verigo');
  out.death = exact('death', 'dead', 'die');
  out.shoot = exact('shoot', 'standing_draw_arrow', 'draw_arrow') || (bow ? (exact('attack') || out.attack) : out.cast);
  if (bow && !exact('cast')) out.cast = out.shoot;

  if (!out.idle) out.idle = hit(/^idle(_\d+)?$/i) || hit(/gs_idle|stand(?!2)|breath|^wait$|^show$/i);
  if (!out.walk) out.walk = hit(/^walk(_\d+)?$/i) || hit(/gs_walk|^walk/i);
  if (!out.run) out.run = hit(/^run(_\d+)?$/i) || hit(/gs_run|^run$|sprint/i);
  if (!out.attack) out.attack = hit(/^attack|commonattack|strike_1|attack01/i);
  if (!out.cast) out.cast = hit(/use_magic|use_skill|skill_ready|skill_1|skill$/i);
  if (!out.death) out.death = hit(/death|die|dead/i);
  if (!out.hit) out.hit = hit(/^hit$|^hurt$|flinch|react_hit|gethit/i);
  if (!out.stun) out.stun = hit(/^stun$|stagger/i) || out.hit;

  if (!out.idle && clips?.[0]) out.idle = clips[0];
  if (!out.walk) out.walk = out.run || out.idle;
  if (!out.run) out.run = out.sprint || out.walk;
  if (!out.sprint) out.sprint = out.run;
  if (!out.cast) out.cast = out.attack;
  if (!out.shoot) out.shoot = out.cast;
  return out;
}

/** First role in the fallback chain that actually has a clip. */
export function resolveClipName(clips, name) {
  const chain = CLIP_FALLBACK[name] || [name];
  for (const k of chain) {
    if (clips?.[k]) return k;
  }
  return null;
}

export function animForSpell(clips, spell, { comboStage = 0, sprint = false } = {}) {
  const kind = spell?.kind || '';
  if (spell?.classSkill && spell.combatLab) {
    const slot = Number(spell.slot) || 0;
    if (slot >= 3 && clips?.attack3) return 'attack3';
    if (slot >= 2 && clips?.attack2) return 'attack2';
    return resolveClipName(clips, 'cast') || 'cast';
  }
  const slashy = kind === 'slash' || kind === 'dash' || spell?.anim === 'attack';
  if (slashy) {
    if (sprint && clips?.jumpAtk && kind === 'slash') return resolveClipName(clips, 'jumpAtk') || 'attack';
    if (kind === 'dash') return resolveClipName(clips, 'dashAtk') || 'attack';
    if (comboStage >= 2 && clips?.attack3) return 'attack3';
    if (comboStage >= 1 && clips?.attack2) return 'attack2';
    return resolveClipName(clips, 'attack') || 'attack';
  }
  if (kind === 'projectile') return resolveClipName(clips, 'shoot') || 'cast';
  return resolveClipName(clips, 'cast') || 'cast';
}

/** Melee active frames: 0.28–0.55 of clip, same as grudge6 combat runtime. */
export function hitWindowSec(clipOrDur, frac = 0.32) {
  const dur = typeof clipOrDur === 'number' ? clipOrDur : (clipOrDur?.duration || 0.42);
  return Math.max(0.12, dur * frac);
}
