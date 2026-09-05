import { loadoutFor, weaponsForClass, WEAPON_LABEL } from './weaponSkills.js';
import { CLASS_IDS, CLASSES, PLAY, ROLE_KITS, portraitFallback, portraitUrl } from '../ssot.js';
import { T8_CLASS_SETS, starterForClass } from './t0ClassSets.js';
import { SKILL_ICON_CDN } from './skillIconCdn.js';

const UI = '/ui/craftpix';

const SKILL_ICON = {
  t0_sword_practice_slash: 'sword',
  t0_sword_guard_stance: 'shield',
  t0_sword_quick_thrust: 'sword',
  t0_sword_wide_sweep: 'sword',
  sword_heroic_cleave: 'sword',
  sword_blood_rush: 'sword',
  staff_fire_bolt: 'fireball',
  staff_flame_wave: 'fireball',
  staff_meteor_strike: 'fireball',
  staff_frost_bolt: 'arrows',
  staff_ice_nova: 'arrows',
  staff_holy_light: 'holy',
  staff_radiant_heal: 'holy',
  t0_bow_practice_shot: 'bow',
  bow_quick_shot: 'bow',
  t0_gun_practice_shot: 'bow',
  gun_grudge_shot: 'bow',
  t0_dagger_practice_stab: 'sword',
  t0_hammer_practice_smash: 'shield',
  t0_staff_vine_lash: 'nature',
  staff_natures_fury: 'nature',
  t0_staff_healing_sprout: 'holy',
  cleave: 'sword',
  shield_bash: 'shield',
  gs_samurai_combo: 'sword',
  gs_samurai_dash: 'sword',
  gs_samurai_teleport: 'void',
  flame_sword: 'fireball',
  fireball: 'fireball',
  frostlance: 'arrows',
  thunder: 'storm',
  holy_beam: 'holy',
  holy_nova: 'holy',
  glacier: 'nature',
  snare: 'tome',
  void_dash: 'void',
};

function iconFor(spell) {
  if (spell?.iconUrl) return spell.iconUrl;
  if (spell?.icon && String(spell.icon).startsWith('/icons/')) {
    return `https://assets.grudge-studio.com${spell.icon}`;
  }
  if (spell?.id && SKILL_ICON_CDN[spell.id]) return SKILL_ICON_CDN[spell.id];
  const sid = spell.id || '';
  const id = SKILL_ICON[sid]
    || (/tower_|shield|guard|parry|block|endure/.test(sid) ? 'shield'
      : /bow_|arrow/.test(sid) ? 'bow'
      : /gun_/.test(sid) ? 'bow'
      : /staff_fire|flame|meteor|inferno/.test(sid) ? 'fireball'
      : /staff_frost|ice|glacial|blizzard/.test(sid) ? 'arrows'
      : /staff_holy|radiant|divine|beacon/.test(sid) ? 'holy'
      : /staff_nature|vine|sprout|natures/.test(sid) ? 'nature'
      : /gs_|sword_|cleave|stab|thrust|hammer_/.test(sid) ? 'sword'
      : spell.kind === 'slash' ? 'sword'
      : spell.kind === 'projectile' ? 'fireball'
      : 'tome');
  return `${UI}/icons/${id}.png`;
}

export function mountHud() {
  let el = document.getElementById('play-hud');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'play-hud';
  el.hidden = true;
  el.innerHTML = `
    <div class="ph-crosshair" id="ph-crosshair" aria-hidden="true"></div>
    <div class="ph-top">
      <div class="ph-frame" id="ph-frame">
        <div class="ph-portrait">
          <img id="ph-portrait-img" alt="" width="56" height="56" />
          <b id="ph-crest-mark">W</b>
        </div>
        <div class="ph-vitals">
          <div class="ph-id"><b id="ph-class">WORGE</b><span id="ph-race">HUMAN</span><em id="ph-lv">Lv 20</em></div>
          <div class="ph-meter hp"><em>HP</em><div class="track"><i></i></div><b id="ph-hp">0</b></div>
          <div class="ph-meter mp"><em>MP</em><div class="track"><i></i></div><b id="ph-mp">0</b></div>
          <div class="ph-meter st"><em>ST</em><div class="track"><i></i></div><b id="ph-st">0</b></div>
        </div>
      </div>
      <div class="ph-party" id="ph-party"></div>
      <div class="ph-obj-wrap">
        <span class="ph-obj-lab">OBJECTIVE</span>
        <div class="ph-obj" id="ph-obj">Enter the halls</div>
      </div>
    </div>
    <div class="ph-target" id="ph-target" hidden>
      <img id="ph-target-img" alt="" width="36" height="36" />
      <div>
        <b id="ph-target-name">—</b>
        <div class="ph-meter hp"><div class="track"><i></i></div></div>
      </div>
    </div>
    <div class="ph-defend" id="ph-defend"><span>X dodge</span><span>C parry</span><span>E shrine</span></div>
    <div class="ph-lock" id="ph-lock" hidden>
      <b>LOCKPICK</b>
      <em id="ph-lock-lab">Dungeon latch</em>
      <div class="ph-lock-dial"><i id="ph-lock-pin"></i><s id="ph-lock-sweet"></s></div>
      <div class="ph-lock-hold"><i id="ph-lock-bar"></i></div>
    </div>
    <div class="ph-bar6" id="ph-bar6"></div>
    <div class="ph-cast" id="ph-cast" hidden><i></i><b id="ph-cast-name"></b></div>
    <div class="ph-toast" id="ph-toast"></div>
    <div class="ph-end" id="ph-end" hidden>
      <h2 id="ph-end-title">CLEARED</h2>
      <p id="ph-end-sub"></p>
      <button type="button" class="btn primary" id="ph-again">RETURN TO FORGE</button>
    </div>
  `;
  document.body.appendChild(el);
  setHudSkills(el, loadoutFor('worge'));
  return el;
}

export function setHudSkills(hud, skills) {
  const bar = hud.querySelector('#ph-bar6');
  if (!bar) return;
  bar.innerHTML = '';
  for (const s of skills) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ph-slot';
    b.dataset.slot = String(s.slot);
    if (s.heal) b.classList.add('heal');
    b.innerHTML = `<img class="ico" alt="" src="${iconFor(s)}" /><i class="ring"></i><kbd>${s.slot}</kbd><span>${s.name}</span>`;
    bar.appendChild(b);
  }
}

export function bindHud(hud, { onCast, onExit, onHealFocus }) {
  hud.querySelector('#ph-bar6').addEventListener('click', (e) => {
    const slot = e.target.closest('.ph-slot');
    if (!slot) return;
    onCast(Number(slot.dataset.slot));
  });
  hud.querySelector('#ph-party')?.addEventListener('click', (e) => {
    const mate = e.target.closest('.ph-mate');
    if (!mate || !onHealFocus) return;
    onHealFocus(mate.dataset.focus || 'player');
  });
  hud.querySelector('#ph-again').addEventListener('click', () => {
    const again = hud.querySelector('#ph-again');
    const dest = again?.dataset?.returnUrl;
    if (dest) {
      const abs = dest.startsWith('http') ? dest : `https://grudgewarlords.com${dest}`;
      location.href = abs;
      return;
    }
    onExit?.();
  });
}

export function renderHud(state) {
  const hud = document.getElementById('play-hud');
  if (!hud || hud.hidden) return;
  const setMeter = (sel, cur, max) => {
    const el = hud.querySelector(sel);
    if (!el) return;
    const fill = el.querySelector('i');
    const lab = el.querySelector('b');
    const pct = max > 0 ? Math.max(0, Math.min(100, 100 * cur / max)) : 0;
    if (fill) fill.style.width = `${pct}%`;
    if (lab) lab.textContent = `${Math.ceil(cur)}/${Math.ceil(max)}`;
  };
  setMeter('.ph-vitals .ph-meter.hp', state.hp, state.hpMax);
  setMeter('.ph-vitals .ph-meter.mp', state.mana, state.manaMax);
  setMeter('.ph-vitals .ph-meter.st', state.stamina ?? 0, state.staminaMax ?? 100);
  if (state.className) hud.querySelector('#ph-class').textContent = String(state.className).toUpperCase();
  if (state.raceName) hud.querySelector('#ph-race').textContent = String(state.raceName).toUpperCase();
  const lv = hud.querySelector('#ph-lv');
  if (lv) lv.textContent = `Lv ${state.level || 20}`;
  const mark = hud.querySelector('#ph-crest-mark');
  const pimg = hud.querySelector('#ph-portrait-img');
  if (pimg) {
    const src = state.portrait || portraitUrl(state.raceId, state.classId);
    if (pimg.getAttribute('src') !== src) {
      pimg.src = src;
      pimg.onerror = () => { pimg.onerror = null; pimg.src = portraitFallback(state.raceId); };
    }
    if (mark) mark.hidden = true;
  } else if (mark) {
    mark.textContent = String(state.className || 'W').charAt(0).toUpperCase();
  }
  hud.querySelector('#ph-obj').textContent = state.objective;
  hud.querySelectorAll('.ph-slot').forEach((el) => {
    const slot = Number(el.dataset.slot);
    const cd = state.cds[slot] || 0;
    const max = state.cdMax[slot] || 1;
    el.classList.toggle('cd', cd > 0);
    el.classList.toggle('on', state.activeSlot === slot);
    const pct = cd > 0 ? Math.round(100 * cd / max) : 0;
    el.querySelector('.ring').style.background =
      pct > 0
        ? `conic-gradient(#000c ${pct}%, transparent ${pct}%)`
        : 'transparent';
  });
  const cast = hud.querySelector('#ph-cast');
  if (state.casting > 0) {
    cast.hidden = false;
    cast.classList.toggle('heal', !!state.castHeal);
    cast.querySelector('i').style.width = `${100 * (1 - state.casting / state.castMax)}%`;
    const nm = hud.querySelector('#ph-cast-name');
    if (nm) nm.textContent = state.castName || (state.castHeal ? 'Heal' : '');
  } else {
    cast.hidden = true;
  }
  const party = hud.querySelector('#ph-party');
  if (party) {
    party.innerHTML = (state.party || []).map((p) => `
      <div class="ph-mate${p.you ? ' you' : ''}${p.hp <= 0 ? ' down' : ''}${String(state.healFocus) === String(p.id) ? ' focus' : ''}" data-focus="${p.id || (p.you ? 'player' : '')}">
        <img alt="" src="${portraitUrl(p.raceId, p.classId)}" data-fallback="${portraitFallback(p.raceId)}" width="24" height="24" />
        <b>${p.you ? 'YOU · ' : ''}${p.name}</b>
        <i style="width:${Math.max(0, 100 * p.hp / Math.max(1, p.hpMax))}%"></i>
      </div>`).join('');
    party.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => {
        const fb = img.dataset.fallback;
        if (fb && img.src !== fb) img.src = fb;
      }, { once: true });
    });
  }
  const tgt = hud.querySelector('#ph-target');
  if (tgt) {
    if (state.target && state.target.hp > 0) {
      tgt.hidden = false;
      tgt.querySelector('#ph-target-name').textContent = state.target.name;
      const fill = tgt.querySelector('.track i');
      if (fill) fill.style.width = `${Math.max(0, 100 * state.target.hp / Math.max(1, state.target.hpMax))}%`;
    } else {
      tgt.hidden = true;
    }
  }
  const def = hud.querySelector('#ph-defend');
  if (def) {
    def.classList.toggle('ifr', !!(state.dashing || (state.iframes || 0) > 0));
    def.classList.toggle('par', (state.parryT || 0) > 0);
  }
  const lock = hud.querySelector('#ph-lock');
  if (lock) {
    const lp = state.lockpick;
    if (lp && lp.status === 'active') {
      lock.hidden = false;
      const lab = hud.querySelector('#ph-lock-lab');
      if (lab) lab.textContent = lp.challenge?.label || 'Latch';
      const pin = hud.querySelector('#ph-lock-pin');
      const sweet = hud.querySelector('#ph-lock-sweet');
      const bar = hud.querySelector('#ph-lock-bar');
      if (pin) pin.style.transform = `rotate(${lp.pinAngle}rad)`;
      if (sweet) sweet.style.transform = `rotate(${lp.sweetAngle}rad)`;
      if (bar) bar.style.width = `${Math.round((lp.holdProgress || 0) * 100)}%`;
    } else {
      lock.hidden = true;
    }
  }
}

export function showEnd(win, text, opts = {}) {
  const box = document.getElementById('ph-end');
  if (!box) return;
  box.hidden = false;
  document.getElementById('ph-end-title').textContent = win ? 'BOSS SLAIN' : 'YOU FELL';
  document.getElementById('ph-end-sub').textContent = text;
  const again = document.getElementById('ph-again');
  if (again) {
    again.textContent = opts.returnLabel || 'RETURN TO FORGE';
    again.dataset.returnUrl = opts.returnUrl || '';
  }
}

export function fillEquipPanel({ raceId = 'human', classId = 'worge', weaponId, level = PLAY.level, sheet } = {}) {
  const body = document.getElementById('equip-body');
  if (!body) return;
  const kit = ROLE_KITS[classId] || ROLE_KITS.warrior;
  const sets = weaponsForClass(classId);
  const rows = CLASS_IDS.map((id) => {
    const k = ROLE_KITS[id] || ROLE_KITS.warrior;
    const ws = (T8_CLASS_SETS[id] || []).map((s) => s.name || WEAPON_LABEL[s.id] || s.id).join(' · ');
    const on = id === classId ? ' on' : '';
    return `<div class="eq-row${on}"><b>${(CLASSES[id]?.label || id).toUpperCase()}</b><span>${k.body}/${k.arms}/${k.legs} · ${ws}</span></div>`;
  }).join('');
  body.innerHTML = `
    <p class="eq-hero">${String(raceId).toUpperCase()} · ${(CLASSES[classId]?.label || classId).toUpperCase()} · Lv ${level}</p>
    <p class="eq-stat">HP ${sheet?.hpMax ?? '—'} · MP ${sheet?.manaMax ?? '—'} · AR ${sheet?.armor ?? kit.body}</p>
    <p class="eq-slot">BODY ${kit.body} · ARMS ${kit.arms} · LEGS ${kit.legs} · HEAD ${kit.head} · SHOULDERS ${kit.shoulders}</p>
    <p class="eq-wep">T8 ${ (T8_CLASS_SETS[classId] || []).map((s) => s.name || s.id).join('  /  ')} · armed ${WEAPON_LABEL[weaponId] || weaponId || sets[0]} · Q swap</p>
    <p class="eq-wep">T0 start ${starterForClass(classId).name} (${starterForClass(classId).t0})</p>
    <div class="eq-all">${rows}</div>
  `;
}

export function toast(msg) {
  const el = document.getElementById('ph-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 1600);
}
