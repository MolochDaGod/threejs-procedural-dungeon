/**
 * ElvUI-style HUD layout + binds. CraftPix bars stay the chrome.
 * Defaults = fleet combat (1–6 weapon, F class, X dodge, C parry, E block).
 * Player may move frames and remap slots; missing ids fall back to catalog.
 */
const KEY = 'grudge-dungeon-hud-v1';

export const HUD_BINDS_DEFAULT = {
  w1: 'Digit1',
  w2: 'Digit2',
  w3: 'Digit3',
  w4: 'Digit4',
  w5: 'Digit5',
  i6: 'Digit6',
  i7: 'Digit7',
  m8: 'Digit8',
  c0: 'KeyF',
  c1: '',
  c2: '',
  c3: '',
  dodge: 'KeyX',
  parry: 'KeyC',
  block: 'KeyE',
  swap: 'KeyQ',
};

const FRAMES = ['ph-frame', 'ph-party', 'ph-obj-wrap', 'ph-target', 'ph-bar6', 'ph-bar-class', 'ph-defend', 'ph-timer', 'ph-cast'];

function blank() {
  return { binds: { ...HUD_BINDS_DEFAULT }, slots: null, pos: {}, barOn: { weapon: true, class: true } };
}

export function loadHudLayout() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const d = JSON.parse(raw);
    return {
      binds: { ...HUD_BINDS_DEFAULT, ...(d.binds || {}) },
      slots: d.slots && typeof d.slots === 'object' ? d.slots : null,
      pos: d.pos && typeof d.pos === 'object' ? d.pos : {},
      barOn: { weapon: true, class: true, ...(d.barOn || {}) },
    };
  } catch {
    return blank();
  }
}

export function saveHudLayout(layout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout));
  } catch { /* quota */ }
}

export function resetHudLayout() {
  const d = blank();
  saveHudLayout(d);
  return d;
}

export function keyLabel(code) {
  if (!code) return '·';
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Key')) return code.slice(3);
  return code.replace('Shift', '⇧').replace('Control', 'Ctrl');
}

/** Optimal bars from current kits. Custom slots keep ids that still exist. */
export function optimalSlots(loadout, classSkills) {
  return {
    weapon: (loadout || []).slice(0, 5).map((s) => s.id),
    class: (classSkills || []).slice(0, 6).map((s) => s.id),
  };
}

export function resolveBarSlots(layout, loadout, classSkills) {
  const opt = optimalSlots(loadout, classSkills);
  const pool = new Map();
  for (const s of loadout || []) pool.set(s.id, { ...s, bar: 'weapon' });
  for (const s of classSkills || []) pool.set(s.id, { ...s, bar: 'class' });
  const pick = (ids, fallback) => (ids || fallback).map((id, i) => {
    const row = pool.get(id) || pool.get(fallback[i]);
    return row ? { ...row, slot: i } : null;
  }).filter(Boolean);
  const custom = layout.slots;
  return {
    weapon: pick(custom?.weapon, opt.weapon).map((s, i) => ({ ...s, slot: i + 1 })),
    class: pick(custom?.class, opt.class).map((s, i) => ({ ...s, slot: i })),
  };
}

export function applyHudPositions(hud, layout) {
  if (!hud) return;
  for (const id of FRAMES) {
    const el = hud.querySelector(`#${id}`);
    if (!el) continue;
    const p = layout.pos[id];
    if (p && Number.isFinite(p.left) && Number.isFinite(p.top)) {
      el.style.left = `${p.left}px`;
      el.style.top = `${p.top}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.transform = 'none';
    } else {
      el.style.left = '';
      el.style.top = '';
      el.style.right = '';
      el.style.bottom = '';
      el.style.transform = '';
    }
  }
  const w = hud.querySelector('#ph-bar6');
  const c = hud.querySelector('#ph-bar-class');
  if (w) w.hidden = layout.barOn?.weapon === false;
  if (c) c.hidden = layout.barOn?.class === false;
}

export function bindHudEdit(hud, { onLayout, getPool }) {
  const layout = () => loadHudLayout();
  let edit = false;
  let bindSlot = null;

  const chip = hud.querySelector('#ph-hud-edit');
  const tray = hud.querySelector('#ph-tray');

  function setEdit(on) {
    edit = on;
    hud.classList.toggle('edit', edit);
    document.body.classList.toggle('hud-edit', edit);
    if (chip) chip.textContent = edit ? 'LOCK HUD' : 'EDIT HUD';
    if (tray) tray.hidden = !edit;
    if (edit) paintTray();
  }

  function paintTray() {
    if (!tray) return;
    const pool = getPool?.() || [];
    tray.innerHTML = `<b>SKILLS · drag onto a bar</b><div class="ph-tray-list">${
      pool.map((s) => `<button type="button" class="ph-tray-sk" draggable="true" data-id="${s.id}">
        <img alt="" src="${s.iconUrl || ''}" width="28" height="28" /><span>${s.name || s.id}</span>
      </button>`).join('')
    }</div>
    <div class="ph-tray-bars">
      <label><input type="checkbox" data-bar="weapon" ${layout().barOn.weapon !== false ? 'checked' : ''}/> weapon bar</label>
      <label><input type="checkbox" data-bar="class" ${layout().barOn.class !== false ? 'checked' : ''}/> class bar</label>
    </div>
    <button type="button" class="btn" id="ph-hud-reset">RESET DEFAULTS</button>
    <em>Click a slot, then press a key to bind. AA/DD roll stays.</em>`;
  }

  chip?.addEventListener('click', (e) => {
    e.preventDefault();
    setEdit(!edit);
  });

  hud.querySelector('#ph-hud-reset') && 0;
  tray?.addEventListener('click', (e) => {
    if (e.target.id === 'ph-hud-reset' || e.target.closest('#ph-hud-reset')) {
      const d = resetHudLayout();
      applyHudPositions(hud, d);
      onLayout?.(d);
      paintTray();
    }
  });
  tray?.addEventListener('change', (e) => {
    const box = e.target.closest('input[data-bar]');
    if (!box) return;
    const L = layout();
    L.barOn[box.dataset.bar] = box.checked;
    saveHudLayout(L);
    applyHudPositions(hud, L);
    onLayout?.(L);
  });

  tray?.addEventListener('dragstart', (e) => {
    const sk = e.target.closest('.ph-tray-sk');
    if (!sk) return;
    e.dataTransfer.setData('text/skill-id', sk.dataset.id);
  });

  for (const id of FRAMES) {
    const el = hud.querySelector(`#${id}`);
    if (!el) continue;
    el.classList.add('ph-move');
    el.addEventListener('pointerdown', (e) => {
      if (!edit || e.target.closest('.ph-slot') || e.target.closest('button.ph-tray-sk')) return;
      if (e.button !== 0) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const ox = e.clientX - r.left;
      const oy = e.clientY - r.top;
      const move = (ev) => {
        el.style.left = `${ev.clientX - ox}px`;
        el.style.top = `${ev.clientY - oy}px`;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.transform = 'none';
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        const L = layout();
        L.pos[id] = { left: ev.clientX - ox, top: ev.clientY - oy };
        saveHudLayout(L);
        onLayout?.(L);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  hud.addEventListener('dragover', (e) => {
    if (!edit) return;
    if (e.target.closest('.ph-slot')) e.preventDefault();
  });
  hud.addEventListener('drop', (e) => {
    if (!edit) return;
    const slot = e.target.closest('.ph-slot');
    if (!slot) return;
    e.preventDefault();
    const sid = e.dataTransfer.getData('text/skill-id');
    if (!sid) return;
    const bar = slot.closest('#ph-bar-class') ? 'class' : 'weapon';
    const idx = Number(slot.dataset.slot);
    const L = layout();
    const weapon = [...hud.querySelectorAll('#ph-bar6 .ph-slot')].map((n) => n.dataset.id).filter(Boolean);
    const klass = [...hud.querySelectorAll('#ph-bar-class .ph-slot')].map((n) => n.dataset.id).filter(Boolean);
    if (bar === 'weapon') weapon[Math.max(0, idx - 1)] = sid;
    else klass[idx] = sid;
    L.slots = { weapon, class: klass };
    saveHudLayout(L);
    onLayout?.(L);
  });

  hud.addEventListener('click', (e) => {
    if (!edit) return;
    const slot = e.target.closest('.ph-slot');
    if (!slot) return;
    e.preventDefault();
    e.stopPropagation();
    hud.querySelectorAll('.ph-slot.bind').forEach((n) => n.classList.remove('bind'));
    slot.classList.add('bind');
    bindSlot = slot;
  }, true);

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyH' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      setEdit(!edit);
      return;
    }
    if (!edit || !bindSlot) return;
    if (e.code === 'Escape') {
      bindSlot.classList.remove('bind');
      bindSlot = null;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const L = layout();
    const bar = bindSlot.closest('#ph-bar-class') ? 'class' : 'weapon';
    const idx = Number(bindSlot.dataset.slot);
    const key = bar === 'weapon' ? `w${idx}` : `c${idx}`;
    L.binds[key] = e.code;
    saveHudLayout(L);
    const kbd = bindSlot.querySelector('kbd');
    if (kbd) kbd.textContent = keyLabel(e.code);
    bindSlot.classList.remove('bind');
    bindSlot = null;
    onLayout?.(L);
  }, true);

  applyHudPositions(hud, layout());
  return { setEdit, layout, isEdit: () => edit };
}
