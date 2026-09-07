import { loadoutFor, weaponsForClass, WEAPON_LABEL } from './weaponSkills.js';
import { CLASS_IDS, CLASSES, PLAY, ROLE_KITS, portraitFallback, portraitUrl } from '../ssot.js';
import { craftSuiteUrl, mainPanelUrl, playCharacterId } from './ids.js';
import { CRAFTPIX_SLOT_BG, CRAFTPIX_SLOT_BORDER, resolveSkillIcon } from './skillIcons.js';
import { T8_CLASS_SETS, starterForClass } from './t0ClassSets.js';
import { classItemFor, RANGER_LOG, THIEF_SATCHEL } from './classItems.js';
import { craftsForClass } from './classCrafts.js';
import { classSkill0 } from './classSkill0.js';
import { classTreeOf } from './classSkills.js';
import { bagSlots } from './bag.js';
import { applyHudPositions, bindHudEdit, keyLabel, loadHudLayout, resolveBarSlots } from './hudLayout.js';

function iconFor(spell) {
  return resolveSkillIcon(spell);
}

function treeHtml(classId, trees, classState, vial) {
  const relic = classItemFor(classId);
  const f0 = classSkill0(classId);
  const tree = trees ? classTreeOf(trees, classId) : null;
  const tiers = (tree?.tiers || []).slice(0, 6).map((t) => {
    const names = (t.skills || []).slice(0, 8).map((s) => s.name || s.id).join(' · ');
    return `<div class="eq-tier"><i>Lv ${t.requiredLevel || 1}</i><span>${names}</span></div>`;
  }).join('');
  const book = (classState?.earned || relic?.wand?.earnedDefault || []).join(' · ');
  const log = relic?.log ? `<p class="eq-wep">Ranger Log · poison ${RANGER_LOG.poison.unlocks.join(', ')} · traps ${RANGER_LOG.traps.unlocks.join(', ')} · stealth ${RANGER_LOG.stealth.unlocks.join(', ')}</p>` : '';
  const satchel = relic?.satchel ? `<p class="eq-wep">Satchel of Tools · ${THIEF_SATCHEL.unlocks.join(', ')}</p>` : '';
  const wand = relic?.wand ? `<p class="eq-wep">Spell book · ${relic.name} · ${book || 'empty'}</p>` : '';
  const forms = relic?.tank
    ? `<p class="eq-wep">Battle Forms · ${classState?.form || ''} · R cycles</p>`
    : relic?.twoHand ? `<p class="eq-wep">Two-Hand · block can auto-parry</p>` : '';
  const crafts = craftsForClass(classId).map((c) => c.name).join(' · ');
  const craftLine = crafts ? `<p class="eq-wep">Crawl tools · ${crafts} (hold R). Account recipes on CRAFT suite.</p>` : '';
  const vialLine = vial ? `<p class="eq-wep">Tonic vial · ${vial.id} · ${Math.round(vial.charge || 0)}/${vial.max || 100} (fills in combat)</p>` : '';
  const trinket = `<p class="eq-wep">Trinket (WoW relic slot) · ${classState?.trinketId || 'empty'}</p>`;
  return `<header class="eq-bag-h">CLASS ITEM · ${relic?.name || classId}${f0 ? ` · F ${f0.name}` : ''}</header>${forms}${wand}${log || ''}${satchel || ''}${craftLine}${vialLine}${trinket}${tiers || '<p class="eq-wep">Tree loads with crawl</p>'}`;
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
    <div class="ph-defend" id="ph-defend"><span>X dodge</span><span>C parry</span><span>E block</span></div>
    <button type="button" class="ph-hud-edit" id="ph-hud-edit">EDIT HUD</button>
    <div class="ph-tray" id="ph-tray" hidden></div>
    <div class="ph-radial" id="ph-radial" hidden></div>
    <div class="ph-mounts" id="ph-mounts" hidden></div>
    <div class="ph-radial ph-item-radial" id="ph-item-radial" hidden></div>
    <div class="ph-lock" id="ph-lock" hidden>
      <b>LOCKPICK</b>
      <em id="ph-lock-lab">Dungeon latch</em>
      <div class="ph-lock-dial"><i id="ph-lock-pin"></i><s id="ph-lock-sweet"></s></div>
      <div class="ph-lock-hold"><i id="ph-lock-bar"></i></div>
    </div>
    <div class="ph-bar-class" id="ph-bar-class"></div>
    <div class="ph-bar6" id="ph-bar6"></div>
    <div class="ph-cast" id="ph-cast" hidden><i></i><b id="ph-cast-name"></b></div>
    <div class="ph-toast" id="ph-toast"></div>
    <div class="ph-timer" id="ph-timer" hidden>0:00</div>
    <div class="ph-revive" id="ph-revive" hidden><i></i><b>HOLD E · LIFT</b></div>
    <div class="ph-loot" id="ph-loot" hidden>
      <b>LOOT BODY</b>
      <em id="ph-loot-who"></em>
      <div class="ph-loot-list" id="ph-loot-list"></div>
      <kbd>E</kbd>
    </div>
    <div class="ph-gate" id="ph-gate" hidden>
      <b>GATE</b>
      <em id="ph-gate-msg">E · OPEN</em>
      <i id="ph-gate-bar"></i>
    </div>
    <div class="ph-load" id="ph-load" hidden><i></i><b>Loading dungeon…</b></div>
    <div class="ph-lobby" id="ph-lobby" hidden>
      <header>FOUR HEROES · pick class &amp; weapon · then enter</header>
      <div class="ph-lobby-rooms" id="ph-lobby-rooms"></div>
      <div class="ph-lobby-cards" id="ph-lobby-cards"></div>
      <button type="button" class="btn primary" id="ph-enter-crawl">ENTER CRAWL</button>
    </div>
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

function paintSlot(s, keyLabel) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ph-slot';
  b.dataset.slot = String(s.slot);
  if (s.id) b.dataset.id = s.id;
  if (s.heal) b.classList.add('heal');
  if (s.classSkill) b.classList.add('class');
  if (s.item) b.classList.add('item');
  if (s.mount) b.classList.add('mount');
  b.style.backgroundImage = `url("${CRAFTPIX_SLOT_BG}")`;
  const src = iconFor(s);
  const extra = s.n != null ? ` ×${s.n}` : '';
  const label = s.name || s.id || '';
  b.title = [label, s.t8Name || s.weaponName, s.t8].filter(Boolean).join(' · ');
  b.innerHTML = `<img class="ico" alt="${label}" src="${src}" /><img class="slot-border" alt="" src="${CRAFTPIX_SLOT_BORDER}" /><i class="ring"></i><kbd>${keyLabel}</kbd><span>${label}${extra}</span>`;
  const img = b.querySelector('img');
  img.addEventListener('error', () => {
    img.onerror = null;
    img.src = resolveSkillIcon({ id: '' });
  }, { once: true });
  return b;
}

export function setHudSkills(hud, skills) {
  const binds = loadHudLayout().binds;
  const bar = hud.querySelector('#ph-bar6');
  if (!bar) return;
  bar.innerHTML = '';
  for (const s of skills) {
    const key = s.slot <= 5 ? binds[`w${s.slot}`] : s.slot === 8 ? binds.m8 : binds[`i${s.slot}`];
    bar.appendChild(paintSlot(s, keyLabel(key || String(s.slot))));
  }
}

export function setHudClassSkills(hud, skills) {
  const binds = loadHudLayout().binds;
  const bar = hud.querySelector('#ph-bar-class');
  if (!bar) return;
  bar.innerHTML = '';
  for (const s of skills) {
    const ck = binds[`c${s.slot}`] || (s.slot === 0 ? 'KeyF' : `Shift+Digit${s.slot}`);
    bar.appendChild(paintSlot(s, keyLabel(ck)));
  }
}

export function paintMountMenu(hud, mounts, current, open) {
  const el = hud?.querySelector('#ph-mounts');
  if (!el) return;
  el.hidden = !open;
  if (!open) return;
  el.innerHTML = `<b>MOUNTS</b>${(mounts || []).map((m) =>
    `<button type="button" data-mount="${m.id}" class="${m.id === current ? 'on' : ''}">${m.name}</button>`).join('')}`;
}

export function paintItemRadial(hud, opts, open) {
  const el = hud?.querySelector('#ph-item-radial');
  if (!el) return;
  el.hidden = !open;
  if (!open) return;
  el.innerHTML = (opts || []).map((s, i) => `<button type="button" data-item-slot="${i}">
    <kbd>R${i ? i + 1 : ''}</kbd>${s.name || s.id}
  </button>`).join('') || '<em>No class item options</em>';
}

export function paintClassRadial(hud, classSkills, open) {
  const el = hud?.querySelector('#ph-radial');
  if (!el) return;
  el.hidden = !open;
  if (!open) return;
  const opts = (classSkills || []).slice(1, 6);
  el.innerHTML = opts.map((s, i) => `<button type="button" data-class-slot="${i + 1}">
    <kbd>⇧${i + 1}</kbd>${s.name || s.id}
  </button>`).join('') || '<em>No class options</em>';
}

export function paintMappedBars(hud, loadout, classSkills, extra = {}) {
  const L = loadHudLayout();
  const bars = resolveBarSlots(L, loadout, classSkills);
  const items = extra.items || [];
  const mount = extra.mount || { id: 'none', name: 'Mount' };
  const combat = [
    ...bars.weapon.slice(0, 5),
    { slot: 6, item: true, ...(items[0] || { id: 'empty', name: 'Item' }) },
    { slot: 7, item: true, ...(items[1] || { id: 'empty', name: 'Item' }) },
    { slot: 8, mount: true, id: mount.id, name: mount.name },
  ];
  setHudSkills(hud, combat);
  setHudClassSkills(hud, bars.class);
  applyHudPositions(hud, L);
  const def = hud.querySelector('#ph-defend');
  if (def) {
    def.innerHTML = `<span>${keyLabel(L.binds.dodge)} dodge</span><span>${keyLabel(L.binds.parry)} parry</span><span>${keyLabel(L.binds.block)} block</span>`;
  }
}

export function bindHud(hud, { onCast, onClassCast, onUseItem, onMount, onMountMenu, onItemRadial, onExit, onHealFocus, onEnterCrawl, onPickClass, onPickWeapon, onPickAlly, onHudLayout, getSkillPool, onLootBody }) {
  hud.querySelector('#ph-bar6').addEventListener('click', (e) => {
    const slot = e.target.closest('.ph-slot');
    if (!slot) return;
    const n = Number(slot.dataset.slot);
    if (n === 8) onMount?.();
    else if (n === 6 || n === 7) onUseItem?.(n - 6);
    else onCast(n);
  });
  hud.querySelector('#ph-bar6').addEventListener('contextmenu', (e) => {
    const slot = e.target.closest('.ph-slot');
    if (!slot || Number(slot.dataset.slot) !== 8) return;
    e.preventDefault();
    onMountMenu?.();
  });
  hud.querySelector('#ph-bar-class')?.addEventListener('click', (e) => {
    const slot = e.target.closest('.ph-slot');
    if (!slot) return;
    onClassCast?.(Number(slot.dataset.slot));
  });
  hud.querySelector('#ph-mounts')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mount]');
    if (!b) return;
    onMount?.(b.dataset.mount);
  });
  hud.querySelector('#ph-item-radial')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-item-slot]');
    if (!b) return;
    onItemRadial?.(Number(b.dataset.itemSlot));
  });
  hud.querySelector('#ph-radial')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-class-slot]');
    if (!b) return;
    onClassCast?.(Number(b.dataset.classSlot));
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
  hud.querySelector('#ph-enter-crawl')?.addEventListener('click', () => onEnterCrawl?.());
  hud.querySelector('#ph-loot')?.addEventListener('click', () => onLootBody?.());
  bindHudEdit(hud, {
    onLayout: onHudLayout,
    getPool: getSkillPool,
  });
  hud.querySelector('#ph-lobby-cards')?.addEventListener('change', (e) => {
    const sel = e.target.closest('select');
    if (!sel) return;
    const kind = sel.dataset.kind;
    const who = sel.dataset.who;
    if (kind === 'class' && who === 'player') onPickClass?.(sel.value);
    else if (kind === 'weapon' && who === 'player') onPickWeapon?.(sel.value);
    else if (kind === 'class' && who != null) onPickAlly?.(Number(who), sel.value);
  });
}

let lobbySig = '';

function classOptions(selected) {
  return CLASS_IDS.map((id) => {
    const on = id === selected ? ' selected' : '';
    const role = CLASSES[id]?.role || '';
    return `<option value="${id}"${on}>${(CLASSES[id]?.label || id).toUpperCase()} · ${role}</option>`;
  }).join('');
}

function weaponOptions(classId, selected) {
  return weaponsForClass(classId).map((id) => {
    const on = id === selected ? ' selected' : '';
    return `<option value="${id}"${on}>${WEAPON_LABEL[id] || id}</option>`;
  }).join('');
}

function paintLobby(hud, state) {
  const lobby = hud.querySelector('#ph-lobby');
  if (!lobby) return;
  lobby.hidden = state.phase !== 'lobby';
  if (state.phase !== 'lobby') {
    lobbySig = '';
    return;
  }
  const rooms = state.rooms || [];
  const sig = [
    state.classId, state.weaponId,
    ...(state.party || []).map((p) => `${p.id}:${p.classId}:${p.weaponId || ''}`),
    rooms.join(','),
  ].join('|');
  if (sig === lobbySig) return;
  lobbySig = sig;
  const roomEl = hud.querySelector('#ph-lobby-rooms');
  if (roomEl) {
    roomEl.textContent = rooms.length
      ? `CLEAR ${rooms.length} listed halls · then the warlord`
      : 'Clear listed halls · count foes · slay the warlord';
  }
  const cards = hud.querySelector('#ph-lobby-cards');
  if (!cards || !state.party) return;
  cards.innerHTML = state.party.map((p) => {
    const skills = (p.skills || []).slice(0, 6).map((s) => s.name || s.id).join(' · ');
    const role = CLASSES[p.classId]?.role || '';
    const classSel = p.you
      ? `<select data-kind="class" data-who="player">${classOptions(p.classId)}</select>
         <select data-kind="weapon" data-who="player">${weaponOptions(p.classId, state.weaponId)}</select>`
      : `<select data-kind="class" data-who="${p.id}">${classOptions(p.classId)}</select>`;
    return `<article class="ph-lcard${p.you ? ' you' : ''}">
      <img src="${portraitUrl(p.raceId, p.classId)}" alt="" width="48" height="48" />
      <b>${p.you ? 'YOU' : p.name}</b>
      <em>${String(p.classId || '').toUpperCase()} · ${role}</em>
      ${classSel}
      <span>${skills || '6-slot catalog'}</span>
    </article>`;
  }).join('');
}

export function renderHud(state) {
  const hud = document.getElementById('play-hud');
  if (!hud || hud.hidden) return;
  const end = hud.querySelector('#ph-end');
  if (end && state.phase !== 'over') end.hidden = true;
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
  hud.querySelectorAll('#ph-bar6 .ph-slot').forEach((el) => {
    const slot = Number(el.dataset.slot);
    const cd = (state.cds || {})[slot] || 0;
    const max = (state.cdMax || {})[slot] || 1;
    el.classList.toggle('cd', cd > 0);
    el.classList.toggle('on', state.activeSlot === slot && !state.classActive);
    const pct = cd > 0 ? Math.round(100 * cd / max) : 0;
    const ring = el.querySelector('.ring');
    if (ring) ring.style.background = pct > 0
      ? `conic-gradient(#000c ${pct}%, transparent ${pct}%)`
      : 'transparent';
  });
  hud.querySelectorAll('#ph-bar-class .ph-slot').forEach((el) => {
    const slot = Number(el.dataset.slot);
    const cd = (state.classCds || {})[slot] || 0;
    const max = (state.classCdMax || {})[slot] || 1;
    el.classList.toggle('cd', cd > 0);
    el.classList.toggle('on', state.classActive === slot);
    const pct = cd > 0 ? Math.round(100 * cd / max) : 0;
    const ring = el.querySelector('.ring');
    if (ring) ring.style.background = pct > 0
      ? `conic-gradient(#000c ${pct}%, transparent ${pct}%)`
      : 'transparent';
  });
  const cast = hud.querySelector('#ph-cast');
  if (cast && state.casting > 0) {
    cast.hidden = false;
    cast.classList.toggle('heal', !!state.castHeal);
    const fill = cast.querySelector('i');
    if (fill) fill.style.width = `${100 * (1 - state.casting / Math.max(0.01, state.castMax || 1))}%`;
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
  const load = hud.querySelector('#ph-load');
  if (load) load.hidden = state.phase !== 'loading';
  paintLobby(hud, state);
  const timer = hud.querySelector('#ph-timer');
  if (timer) {
    if (state.phase === 'crawl' && state.timer0) {
      const sec = Math.max(0, Math.floor((performance.now() - state.timer0) / 1000));
      timer.hidden = false;
      timer.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    } else timer.hidden = true;
  }
  const rev = hud.querySelector('#ph-revive');
  if (rev) {
    const show = (state.reviveT || 0) > 0.05;
    rev.hidden = !show;
    if (show) rev.querySelector('i').style.width = `${Math.min(100, (state.reviveT / 2) * 100)}%`;
  }
  const gate = hud.querySelector('#ph-gate');
  if (gate) {
    const g = state.gate;
    const show = !!g && (state.reviveT || 0) <= 0.05 && !state.lootBody;
    gate.hidden = !show;
    if (show) {
      const msg = gate.querySelector('#ph-gate-msg');
      if (msg) msg.textContent = g.force ? `HOLD E · 5s · ${g.n} aggro` : 'E · OPEN';
      const bar = gate.querySelector('#ph-gate-bar');
      if (bar) bar.style.width = g.force ? `${Math.min(100, 100 * (g.t || 0) / Math.max(0.01, g.max || 5))}%` : '0';
    }
  }
  const loot = hud.querySelector('#ph-loot');
  if (loot) {
    const body = state.lootBody;
    const show = !!(body && body.items?.length) && (state.reviveT || 0) <= 0.05;
    loot.hidden = !show;
    if (show) {
      const who = loot.querySelector('#ph-loot-who');
      if (who) who.textContent = body.name || 'Body';
      const list = loot.querySelector('#ph-loot-list');
      if (list) {
        list.innerHTML = body.items.map((s) => `
          <div class="eq-loot"><img src="${s.icon || ''}" alt="" width="28" height="28" /><b>${s.label}</b><span>×${s.n}</span></div>
        `).join('');
      }
    }
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

export function fillEquipPanel({ raceId = 'human', classId = 'worge', weaponId, level = PLAY.level, sheet, bag = {}, classState, trees, vial, characterId = null } = {}) {
  const body = document.getElementById('equip-body');
  if (!body) return;
  const kit = ROLE_KITS[classId] || ROLE_KITS.warrior;
  const sets = weaponsForClass(classId);
  const here = typeof location !== 'undefined' ? location.href : 'https://grudge-dungeons.vercel.app/';
  const cid = playCharacterId(characterId);
  const panelHref = mainPanelUrl({ characterId: cid, from: 'dungeon', returnTo: here });
  const craftHref = craftSuiteUrl({ characterId: cid, from: 'dungeon', returnTo: here });
  const rows = CLASS_IDS.map((id) => {
    const k = ROLE_KITS[id] || ROLE_KITS.warrior;
    const ws = (T8_CLASS_SETS[id] || []).map((s) => s.name || WEAPON_LABEL[s.id] || s.id).join(' · ');
    const on = id === classId ? ' on' : '';
    return `<div class="eq-row${on}"><b>${(CLASSES[id]?.label || id).toUpperCase()}</b><span>${k.body}/${k.arms}/${k.legs} · ${ws}</span></div>`;
  }).join('');
  const slots = bagSlots(bag).map((s) => `
    <div class="eq-loot"><img src="${s.icon || '/ui/craftpix/icons/tome.png'}" alt="" width="28" height="28" /><b>${s.label}</b><span>×${s.n}</span></div>
  `).join('') || '<p class="eq-wep">Crawl bag empty · break tables, barrels, walls (F / skills)</p>';
  body.innerHTML = `
    <nav class="eq-fleet">
      <a href="${panelHref}" target="_blank" rel="noopener">CHARACTER · main panel</a>
      <a href="${craftHref}" target="_blank" rel="noopener">CRAFT · account bag</a>
    </nav>
    <p class="eq-hero">${String(raceId).toUpperCase()} · ${(CLASSES[classId]?.label || classId).toUpperCase()} · Lv ${level}${cid ? ` · ${cid.slice(0, 8)}` : ''}</p>
    <p class="eq-stat">HP ${sheet?.hpMax ?? '—'} · MP ${sheet?.manaMax ?? '—'} · AR ${sheet?.armor ?? kit.body}</p>
    <p class="eq-slot">BODY ${kit.body} · ARMS ${kit.arms} · LEGS ${kit.legs} · HEAD ${kit.head} · SHOULDERS ${kit.shoulders}</p>
    <p class="eq-wep">T8 ${ (T8_CLASS_SETS[classId] || []).map((s) => s.name || s.id).join('  /  ')} · armed ${WEAPON_LABEL[weaponId] || weaponId || sets[0]} · Q swap</p>
    <p class="eq-wep">T0 start ${starterForClass(classId).name} (${starterForClass(classId).t0})</p>
    <p class="eq-wep">F ${classSkill0(classId)?.name || '—'} · item ${classItemFor(classId)?.name || '—'} · R tap / hold R</p>
    <div class="eq-tree">${treeHtml(classId, trees, classState, vial)}</div>
    <div class="eq-all">${rows}</div>
    <header class="eq-bag-h">BAG · crawl yield</header>
    <p class="eq-wep">Account bag + stations live on the craft suite. This list is crawl loot only.</p>
    <div class="eq-bag">${slots}</div>
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
