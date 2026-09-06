/** Crowd control on the existing actor. Not a second combat stack. */

export function makeStatus() {
  return { stun: 0, root: 0, freeze: 0, poly: 0, flinch: 0 };
}

export function tickStatus(s, dt) {
  if (!s) return;
  for (const k of Object.keys(s)) s[k] = Math.max(0, s[k] - dt);
}

export function canMove(s) {
  return !s || (s.stun <= 0 && s.root <= 0 && s.freeze <= 0 && s.poly <= 0);
}

export function canAct(s) {
  return !s || (s.stun <= 0 && s.freeze <= 0 && s.poly <= 0 && s.flinch <= 0);
}

export function inferCc(spell) {
  const t = `${spell?.id || ''} ${spell?.name || ''} ${spell?.kind || ''} ${spell?.element || ''}`.toLowerCase();
  if (/poly|sheep|hex|morph|turn_/.test(t)) return { poly: 2.6 };
  if (/stun|bash|stomp|earthshatter|seismic|shockwave|cataclysm/.test(t)) return { stun: 1.15 };
  if (/freeze|frost|glacial|blizzard|ice_nova|absolute|frozen/.test(t)) return { freeze: 1.5 };
  if (/root|entangle|vine|snare|web|bear_trap|planted/.test(t)) return { root: 2.0 };
  return {};
}

export function applyHitReact(s, cc = {}) {
  if (!s) return;
  s.flinch = Math.max(s.flinch, 0.16);
  if (cc.stun) s.stun = Math.max(s.stun, cc.stun);
  if (cc.root) s.root = Math.max(s.root, cc.root);
  if (cc.freeze) s.freeze = Math.max(s.freeze, cc.freeze);
  if (cc.poly) s.poly = Math.max(s.poly, cc.poly);
}

export function paintStatus(actor, s) {
  if (!actor?.root || !s) return;
  const frozen = s.freeze > 0;
  const poly = s.poly > 0;
  actor.root.scale.setScalar(poly ? 0.55 : 1);
  actor.root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m.emissive) m.emissive.setHex(frozen ? 0x4aa8ff : 0x000000);
    }
  });
}
