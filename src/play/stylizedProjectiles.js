/**
 * Stylized Projectiles overlay — trail / head / hit textures on LinearCastWorld.
 * 3D bolts stay orb-*.glb. Pack is NOT a second VFX engine.
 * Catalog SSOT: ObjectStore api/v1/stylized-projectiles.json (VFX-* ids).
 */
import * as THREE from 'three';

export const STYLIZED_VFX_BASE = '/models/vfx/stylized-projectiles';

/** Catalog projectile id → ripped textures. Existing skill ids only. */
export const STYLIZED_PROJECTILES = Object.freeze([
  { id: 'styproj.card', vfxRef: 'VFX-STY-CARD', name: 'Cards', tex: 'Card01.png', trail: 'Trail01.png', hit: 'Glow01.png', muzzle: 'Flash01.png', element: 'arcane', spin: 5, headSize: 0.72, trailLen: 1.7, trailWidth: 0.32, skills: ['staff_arcane_bolt', 'tome_arcane_burst', 't0_tome_practice_cantrip'] },
  { id: 'styproj.shadow', vfxRef: 'VFX-STY-SHADOW', name: 'Shadow', tex: 'Mask01.png', trail: 'Trail08.png', hit: 'Smoke_3.png', muzzle: 'Flare01.png', element: 'shadow', spin: 0, headSize: 0.82, trailLen: 2.0, trailWidth: 0.36, skills: ['staff_void_bolt', 'gun_shadow_shot', 'gun_crimson_blast', 'bow_phantom_arrows'] },
  { id: 'styproj.triangle', vfxRef: 'VFX-STY-TRIANGLE', name: 'Triangle', tex: 'Shape01.png', trail: 'Trail04.png', hit: 'Flash01.png', muzzle: 'Flash01.png', element: 'arcane', spin: 10, headSize: 0.5, trailLen: 1.55, trailWidth: 0.24, skills: ['staff_arcane_missile', 't0_wand_arcane_ping'] },
  { id: 'styproj.heart', vfxRef: 'VFX-STY-HEART', name: 'Heart', tex: 'Glow01.png', trail: 'Trail07.png', hit: 'Flare01.png', muzzle: 'Glow01.png', element: 'holy', spin: 1.2, headSize: 0.78, trailLen: 1.8, trailWidth: 0.34, skills: ['staff_holy_light', 'staff_radiant_heal', 't0_tome_minor_heal'] },
  { id: 'styproj.leaf', vfxRef: 'VFX-STY-LEAF', name: 'Leaf', tex: 'Leaf_1.png', trail: 'Trail06.png', hit: 'Smoke_3.png', muzzle: 'Flare01.png', element: 'nature', spin: 7, headSize: 0.58, trailLen: 1.7, trailWidth: 0.28, skills: ['staff_natures_fury', 't0_staff_vine_lash', 'bow_poison_arrow'] },
  { id: 'styproj.diamond', vfxRef: 'VFX-STY-DIAMOND', name: 'Diamond', tex: 'Shape02.png', trail: 'Trail02.png', hit: 'Snowflakes_1.png', muzzle: 'Glow01.png', element: 'frost', spin: 12, headSize: 0.52, trailLen: 1.85, trailWidth: 0.26, skills: ['staff_frost_bolt', 't0_wand_frost_spark'] },
  { id: 'styproj.diamond2', vfxRef: 'VFX-STY-DIAMOND2', name: 'Diamond B', tex: 'Shape02-hollow.png', trail: 'Trail05.png', hit: 'Snow.png', muzzle: 'Glow01.png', element: 'ice', spin: 9, headSize: 0.62, trailLen: 1.6, trailWidth: 0.3, skills: ['staff_ice_nova', 'staff_glacial_shield'] },
  { id: 'styproj.angelic', vfxRef: 'VFX-STY-ANGELIC', name: 'Angelic', tex: 'Flare01.png', trail: 'Trail09.png', hit: 'Glow01.png', muzzle: 'Flare01.png', element: 'holy', spin: 2, headSize: 0.88, trailLen: 2.0, trailWidth: 0.38, skills: ['staff_crusaders_light', 'staff_retribution'] },
  { id: 'styproj.laser', vfxRef: 'VFX-STY-LASER', name: 'Laser', tex: 'Thin01.png', trail: 'Trail01.png', hit: 'Flash01.png', muzzle: 'Flash01.png', element: 'fire', spin: 0, headSize: 0.38, trailLen: 2.45, trailWidth: 0.16, skills: ['staff_fire_bolt', 'staff_flame_wave', 'gun_explosive_round', 'gun_flame_burst', 'gun_hellfire_barrage', 'gun_demon_blast'] },
  { id: 'styproj.laser2', vfxRef: 'VFX-STY-LASER2', name: 'Laser B', tex: 'Thin02.png', trail: 'Trail02.png', hit: 'Lightning01.png', muzzle: 'Flash01.png', element: 'lightning', spin: 0, headSize: 0.34, trailLen: 2.6, trailWidth: 0.14, skills: ['staff_chain_lightning', 'staff_storm_call', 'gun_grudge_shot', 'gun_sniper_round', 'gun_cannon_execute'] },
  { id: 'styproj.dagger', vfxRef: 'VFX-STY-DAGGER', name: 'Dagger', tex: 'Dagger.png', trail: 'Trail04.png', hit: 'Slash01.png', muzzle: 'Flash01.png', element: 'physical', spin: 14, headSize: 0.48, trailLen: 1.45, trailWidth: 0.2, skills: ['dagger_crimson_stab', 'spear_javelin', 'gs_giant_reach'] },
  { id: 'styproj.dagger2', vfxRef: 'VFX-STY-DAGGER2', name: 'Dagger B', tex: 'Dagger.png', trail: 'Trail08.png', hit: 'Slash02.png', muzzle: 'Flash01.png', element: 'shadow', spin: 16, headSize: 0.48, trailLen: 1.55, trailWidth: 0.2, skills: ['dagger_phantom_dash', 'dagger_shadow_stab'] },
  { id: 'styproj.frost', vfxRef: 'VFX-STY-FROST', name: 'Frost', tex: 'Snowflakes_1.png', trail: 'Trail05.png', hit: 'Glow01.png', muzzle: 'Glow01.png', element: 'frost', spin: 3, headSize: 0.74, trailLen: 1.75, trailWidth: 0.32, skills: ['staff_blizzard', 'staff_absolute_zero'] },
  { id: 'styproj.flower', vfxRef: 'VFX-STY-FLOWER', name: 'Flower', tex: 'Flower.png', trail: 'Trail06.png', hit: 'Leaf_4.png', muzzle: 'Flare01.png', element: 'nature', spin: 2.4, headSize: 0.64, trailLen: 1.5, trailWidth: 0.28, skills: ['t0_staff_healing_sprout'] },
  { id: 'styproj.star', vfxRef: 'VFX-STY-STAR', name: 'Star', tex: 'Star_1.png', trail: 'Trail09.png', hit: 'Flare01.png', muzzle: 'Glow01.png', element: 'holy', spin: 8, headSize: 0.68, trailLen: 1.9, trailWidth: 0.3, skills: ['staff_divine_wave', 'staff_holy_beacon'] },
  { id: 'styproj.electric_shadow', vfxRef: 'VFX-STY-ELECSHADOW', name: 'Electric Shadow', tex: 'Lightning01.png', trail: 'Trail08.png', hit: 'Flash01.png', muzzle: 'Flash01.png', element: 'shadow', spin: 0, headSize: 0.86, trailLen: 2.1, trailWidth: 0.28, skills: ['spear_phantom'] },
  { id: 'styproj.electric', vfxRef: 'VFX-STY-ELECTRIC', name: 'Electric', tex: 'Lightning01.png', trail: 'Trail02.png', hit: 'Flash01.png', muzzle: 'Flash01.png', element: 'lightning', spin: 0, headSize: 0.9, trailLen: 2.3, trailWidth: 0.26, skills: ['staff_thundergods_judgment', 'staff_thunder_cataclysm'] },
  { id: 'styproj.shuriken', vfxRef: 'VFX-STY-SHURIKEN', name: 'Shuriken', tex: 'Shape03.png', trail: 'Trail04.png', hit: 'Slash01.png', muzzle: 'Flash01.png', element: 'physical', spin: 20, headSize: 0.5, trailLen: 1.4, trailWidth: 0.22, skills: ['dagger_raging_blades'] },
  { id: 'styproj.smoke', vfxRef: 'VFX-STY-SMOKE', name: 'Smoke', tex: 'Smoke_1.png', trail: 'Trail09.png', hit: 'Smoke_3.png', muzzle: 'Smoke_2.png', element: 'physical', spin: 0, headSize: 0.92, trailLen: 1.55, trailWidth: 0.4, skills: ['t0_wand_practice_bolt'] },
  { id: 'styproj.arrow', vfxRef: 'VFX-STY-ARROW', name: 'Arrow', tex: 'Arrow01.png', trail: 'Trail04.png', hit: 'Slash01.png', muzzle: 'Flash01.png', element: 'physical', spin: 0, headSize: 0.7, trailLen: 1.9, trailWidth: 0.16, skills: ['t0_bow_practice_shot', 't0_bow_pinning_arrow', 't0_bow_rapid_fire', 'bow_quick_shot', 'bow_multishot', 'bow_piercing'] },
]);

export const STYLIZED_TRAILS = Object.freeze([
  'Trail01.png', 'Trail02.png', 'Trail04.png', 'Trail05.png',
  'Trail06.png', 'Trail07.png', 'Trail08.png', 'Trail09.png',
]);

export const STYLIZED_HITS = Object.freeze([
  { id: 'styhit.alpha', vfxRef: 'VFX-STYHIT-ALPHA', tex: 'Glow01.png', use: 'impact' },
  { id: 'styhit.quad', vfxRef: 'VFX-STYHIT-QUAD', tex: 'Flash01.png', use: 'impact' },
  { id: 'styhit.smoke', vfxRef: 'VFX-STYHIT-SMOKE', tex: 'Smoke_3.png', use: 'explosion' },
  { id: 'styhit.head_mesh', vfxRef: 'VFX-STYHIT-SLASH', tex: 'Slash01.png', use: 'melee' },
  { id: 'styhit.head_quad', vfxRef: 'VFX-STYHIT-SLASH2', tex: 'Slash02.png', use: 'slash' },
]);

export const STYLIZED_MUZZLE = Object.freeze([
  { id: 'stymuz.core', vfxRef: 'VFX-STYMUZ-CORE', tex: 'Flash01.png' },
  { id: 'stymuz.emitter', vfxRef: 'VFX-STYMUZ-EMIT', tex: 'Flare01.png' },
  { id: 'stymuz.smoke', vfxRef: 'VFX-STYMUZ-SMOKE', tex: 'Smoke_2.png' },
  { id: 'stymuz.shape', vfxRef: 'VFX-STYMUZ-SHAPE', tex: 'Glow01.png' },
]);

const BY_SKILL = new Map();
for (const p of STYLIZED_PROJECTILES) {
  for (const id of p.skills) {
    if (!BY_SKILL.has(id)) BY_SKILL.set(id, p);
  }
}

const BY_ELEMENT = {
  fire: 'styproj.laser',
  frost: 'styproj.frost',
  ice: 'styproj.diamond',
  nature: 'styproj.leaf',
  holy: 'styproj.heart',
  shadow: 'styproj.shadow',
  lightning: 'styproj.electric',
  storm: 'styproj.electric',
  arcane: 'styproj.card',
  physical: 'styproj.arrow',
};

const BY_ID = new Map(STYLIZED_PROJECTILES.map((p) => [p.id, p]));

const ID_PATTERNS = [
  { re: /bow_|_arrow|quick_shot|multishot|piercing|pinning/, id: 'styproj.arrow' },
  { re: /gun_|sniper|cannon/, fire: 'styproj.laser', shadow: 'styproj.shadow', def: 'styproj.laser2' },
  { re: /javelin|giant_reach/, id: 'styproj.dagger' },
  { re: /frost|ice|glacial|blizzard|spark/, id: 'styproj.diamond' },
  { re: /holy|radiant|heal|beacon|divine|crusader/, id: 'styproj.heart' },
  { re: /nature|vine|leaf|poison|sprout/, id: 'styproj.leaf' },
  { re: /lightning|thunder|storm/, id: 'styproj.electric' },
  { re: /fire|flame|inferno|meteor|hell/, id: 'styproj.laser' },
  { re: /shadow|void|phantom/, id: 'styproj.shadow' },
  { re: /arcane|wand|cantrip|card/, id: 'styproj.card' },
];

function pack(row, kind) {
  if (!row) return null;
  const slash = kind === 'slash' || kind === 'dash';
  return {
    id: row.id,
    vfxRef: row.vfxRef,
    overlayRef: row.vfxRef,
    head: slash ? (row.hit || 'Slash01.png') : row.tex,
    trail: slash ? (row.trail || 'Trail08.png') : row.trail,
    hit: slash ? 'Slash01.png' : row.hit,
    muzzle: row.muzzle,
    name: row.name,
    spin: slash ? 0 : (row.spin || 0),
    headSize: slash ? Math.max(0.85, row.headSize || 0.62) : (row.headSize || 0.62),
    trailLen: slash ? Math.max(1.8, row.trailLen || 1.55) : (row.trailLen || 1.55),
    trailWidth: slash ? Math.max(0.34, row.trailWidth || 0.28) : (row.trailWidth || 0.28),
  };
}

function fromPatterns(skillId, element) {
  const id = String(skillId || '');
  for (const p of ID_PATTERNS) {
    if (!p.re.test(id)) continue;
    if (p.fire) {
      const key = p[element] || p.def;
      return BY_ID.get(key);
    }
    return BY_ID.get(p.id);
  }
  return null;
}

/** Overlay spec for a catalog skill. Never invents skill ids. */
export function overlayForSkill(skillId, kind, element) {
  const fromSkill = BY_SKILL.get(skillId) || fromPatterns(skillId, element);
  if (fromSkill) return pack(fromSkill, kind);
  if (kind === 'slash' || kind === 'dash') {
    return {
      id: 'styhit.head_mesh',
      vfxRef: 'VFX-STYHIT-SLASH',
      overlayRef: 'VFX-STYHIT-SLASH',
      head: 'Slash01.png',
      trail: 'Trail08.png',
      hit: 'Slash02.png',
      muzzle: 'Flash01.png',
      name: 'Slash',
      spin: 0,
      headSize: 0.85,
      trailLen: 1.4,
      trailWidth: 0.22,
    };
  }
  if (kind === 'nova' || kind === 'zone') {
    const icy = element === 'ice' || element === 'frost';
    const holy = element === 'holy';
    return {
      id: icy ? 'styproj.frost' : holy ? 'styproj.star' : 'styhit.smoke',
      vfxRef: icy ? 'VFX-STY-FROST' : holy ? 'VFX-STY-STAR' : 'VFX-STYHIT-SMOKE',
      overlayRef: icy ? 'VFX-STY-FROST' : holy ? 'VFX-STY-STAR' : 'VFX-STYHIT-SMOKE',
      head: icy ? 'Snowflakes_1.png' : holy ? 'Star_1.png' : 'Smoke_1.png',
      trail: null,
      hit: icy ? 'Snow.png' : holy ? 'Flare01.png' : 'Smoke_3.png',
      muzzle: 'Glow01.png',
      name: 'Burst',
      spin: 4,
      headSize: 1.05,
      trailLen: 1.2,
      trailWidth: 0.4,
    };
  }
  const elId = BY_ELEMENT[element] || BY_ELEMENT.arcane;
  return pack(BY_ID.get(elId), kind);
}

const _loader = new THREE.TextureLoader();
const _tex = new Map();

export function loadStylizedTex(name) {
  if (!name) return Promise.resolve(null);
  if (_tex.has(name)) return Promise.resolve(_tex.get(name));
  return new Promise((resolve) => {
    _loader.load(
      `${STYLIZED_VFX_BASE}/${name}`,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.needsUpdate = true;
        _tex.set(name, t);
        resolve(t);
      },
      undefined,
      () => resolve(null),
    );
  });
}

function tintMat(map, color, opacity = 0.92) {
  return new THREE.MeshBasicMaterial({
    map,
    color: color ?? 0xffffff,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Ribbon behind a traveling bolt. */
export function makeTrailRibbon(map, color, width = 0.28, length = 1.55) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), tintMat(map, color, 0.94));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(0, 0.52, -length * 0.42);
  mesh.name = 'sty-trail';
  mesh.renderOrder = 4;
  return mesh;
}

/** Billboard head (card / dagger / flake). */
export function makeHeadSprite(map, color, size = 0.62) {
  const mat = new THREE.SpriteMaterial({
    map,
    color: color ?? 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  s.position.y = 0.58;
  s.name = 'sty-head';
  s.renderOrder = 5;
  return s;
}

/** One-shot impact / explosion sprite. */
export function makeHitSprite(map, color, size = 1.15) {
  const mat = new THREE.SpriteMaterial({
    map,
    color: color ?? 0xffffff,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  s.name = 'sty-hit';
  s.renderOrder = 6;
  return s;
}

/** Attach trail + head onto a LinearCast root. */
export async function attachStylizedOverlay(root, overlay, color) {
  if (!root || !overlay) return {};
  const [trailMap, headMap, muzMap] = await Promise.all([
    loadStylizedTex(overlay.trail),
    loadStylizedTex(overlay.head),
    loadStylizedTex(overlay.muzzle),
  ]);
  const bits = {};
  if (trailMap) {
    bits.trail = makeTrailRibbon(trailMap, color, overlay.trailWidth || 0.28, overlay.trailLen || 1.55);
    root.add(bits.trail);
  }
  if (headMap) {
    bits.head = makeHeadSprite(headMap, color, overlay.headSize || 0.62);
    bits.head.userData.spin = overlay.spin || 0;
    root.add(bits.head);
  }
  if (muzMap) {
    bits.muzzle = makeHeadSprite(muzMap, color, (overlay.headSize || 0.62) * 1.15);
    bits.muzzle.name = 'sty-muzzle';
    bits.muzzle.position.z = 0.12;
    root.add(bits.muzzle);
  }
  return bits;
}

export async function spawnStylizedHit(scene, at, overlay, color, items) {
  if (!scene || !overlay?.hit) return;
  const map = await loadStylizedTex(overlay.hit);
  if (!map) return;
  const s = makeHitSprite(map, color, 1.25);
  s.position.copy(at);
  if (s.position.y < 0.4) s.position.y = 0.85;
  scene.add(s);
  items.push({ type: 'styhit', root: s, life: 0.28, max: 0.28, grow: 2.6 });
}
