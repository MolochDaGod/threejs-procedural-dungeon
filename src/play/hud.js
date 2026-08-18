import { SPELLS } from '../ssot.js';

export function mountHud() {
  let el = document.getElementById('play-hud');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'play-hud';
  el.hidden = true;
  el.innerHTML = `
    <div class="ph-top">
      <div class="ph-bars">
        <div class="ph-bar hp"><i></i><b id="ph-hp">140</b></div>
        <div class="ph-bar mp"><i></i><b id="ph-mp">100</b></div>
      </div>
      <div class="ph-obj" id="ph-obj">Enter the halls</div>
    </div>
    <div class="ph-bar6" id="ph-bar6"></div>
    <div class="ph-cast" id="ph-cast" hidden><i></i></div>
    <div class="ph-toast" id="ph-toast"></div>
    <div class="ph-end" id="ph-end" hidden>
      <h2 id="ph-end-title">CLEARED</h2>
      <p id="ph-end-sub"></p>
      <button type="button" class="btn primary" id="ph-again">RETURN TO FORGE</button>
    </div>
  `;
  document.body.appendChild(el);
  const bar = el.querySelector('#ph-bar6');
  for (const s of SPELLS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ph-slot';
    b.dataset.slot = String(s.slot);
    b.innerHTML = `<i class="ring"></i><kbd>${s.slot}</kbd><span>${s.name}</span>`;
    bar.appendChild(b);
  }
  return el;
}

export function bindHud(hud, { onCast, onExit }) {
  hud.querySelector('#ph-bar6').addEventListener('click', (e) => {
    const slot = e.target.closest('.ph-slot');
    if (!slot) return;
    onCast(Number(slot.dataset.slot));
  });
  hud.querySelector('#ph-again').addEventListener('click', onExit);
}

export function renderHud(state) {
  const hud = document.getElementById('play-hud');
  if (!hud || hud.hidden) return;
  const hp = hud.querySelector('.ph-bar.hp i');
  const mp = hud.querySelector('.ph-bar.mp i');
  hp.style.width = `${Math.max(0, 100 * state.hp / state.hpMax)}%`;
  mp.style.width = `${Math.max(0, 100 * state.mana / state.manaMax)}%`;
  hud.querySelector('#ph-hp').textContent = Math.ceil(state.hp);
  hud.querySelector('#ph-mp').textContent = Math.ceil(state.mana);
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
    cast.querySelector('i').style.width = `${100 * (1 - state.casting / state.castMax)}%`;
  } else {
    cast.hidden = true;
  }
}

export function showEnd(win, text) {
  const box = document.getElementById('ph-end');
  if (!box) return;
  box.hidden = false;
  document.getElementById('ph-end-title').textContent = win ? 'BOSS SLAIN' : 'YOU FELL';
  document.getElementById('ph-end-sub').textContent = text;
}

export function toast(msg) {
  const el = document.getElementById('ph-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 1600);
}
