/**
 * Stylized Projectiles overlay — trail / head / hit textures on LinearCastWorld.
 * 3D bolts stay orb-*.glb. Pack is NOT a second VFX engine.
 * Catalog SSOT: ObjectStore api/v1/stylized-projectiles.json (VFX-* ids).
 */
import * as THREE from 'three';

export const STYLIZED_VFX_BASE = '/models/vfx/stylized-projectiles';

/** Catalog projectile id → ripped textures. Existing skill ids only. */
export const STYLIZED_PROJECTILES = Object.freeze([
  { id: 'styproj.card', vfxRef: 'VFX-STY-CARD', name: 'Cards', tex: 'Card01.png', trail: 'Trail01.png', hit: 'Glow01.png', muzzle: 'Flash01.png', element: 'arcane', skills: ['staff_arcane_bolt', 'tome_arcane_burst'] },
  { id: 'styproj.shadow', vfxRef: 'VFX-STY-SHADOW', name: 'Shadow', tex: 'Mask01.png', trail: 'Trail08.png', hit: 'Smoke_3.png', muzzle: 'Flare01.png', element: 'shadow', skills: ['staff_void_bolt', 'gun_shadow_shot'] },
  { id: 'styproj.triangle', vfxRef: 'VFX-STY-TRIANGLE', name: 'Triangle', tex: 'Shape01.png', trail: 'Trail04.png', hit: 'Flash01.png', muzzle: 'Flash01.png', element: 'arcane', skills: ['staff_arcane_missile'] },
  { id: 'styproj.heart', vfxRef: 'VFX-STY-HEART', name: 'Heart', tex: 'Glow01.png', trail: 'Trail07.png', hit: 'Flare01.png', muzzle: 'Glow01.png', element: 'holy', skills: ['staff_holy_light', 'staff_radiant_heal'] },
  { id: 'styproj.leaf', vfxRef: 'VFX-STY-LEAF', name: 'Leaf', tex: 'Leaf_1.png', trail: 'Trail06.png', hit: 'Smoke_3.png', muzzle: 'Flare01.png', element: 'nature', skills: ['staff_natures_fury', 't0_staff_vine_lash', 'bow_poison_arrow'] },
  { id: 'styproj.diamond', vfxRef: 'VFX-STY-DIAMOND', name: 'Diamond', tex: 'Shape02.png', trail: 'Trail02.png', hit: 'Snowflakes_1.png', muzzle: 'Glow01.png', element: 'frost', skills: ['staff_frost_bolt'] },
  { id: 'styproj.diamond2', vfxRef: 'VFX-STY-DIAMOND2', name: 'Diamond B', tex: 'Shape02-hollow.png', trail: 'Trail05.png', hit: 'Snow.png', muzzle: 'Glow01.png', element: 'ice', skills: ['staff_ice_nova'] },
  { id: 'styproj.angelic', vfxRef: 'VFX-STY-ANGELIC', name: 'Angelic', tex: 'Flare01.png', trail: 'Trail09.png', hit: 'Glow01.png', muzzle: 'Flare01.png', element: 'holy', skills: ['staff_crusaders_light'] },
  { id: 'styproj.laser', vfxRef: 'VFX-STY-LASER', name: 'Laser', tex: 'Thin01.png', trail: 'Trail01.png', hit: 'Flash01.png', muzzle: 'Flash01.png', element: 'fire', skills: ['staff_fire_bolt'] },
  { id: 'styproj.laser2', vfxRef: 'VFX-STY-LASER2', name: 'Laser B', tex: 'Thin02.png', trail: 'Trail02.png', hit: 'Lightning01.png', muzzle: 'Flash01.png', element: 'lightning', skills: ['staff_chain_lightning', 'staff_storm_call'] },
  { id: 'styproj.dagger', vfxRef: 'VFX-STY-DAGGER', name: 'Dagger', tex: 'Dagger.png', trail: 'Trail04.png', hit: 'Slash01.png', muzzle: 'Flash01.png', element: 'physical', skills: ['dagger_crimson_stab'] },
  { id: 'styproj.dagger2', vfxRef: 'VFX-STY-DAGGER2', name: 'Dagger B', tex: 'Dagger.png', trail: 'Trail08.png', hit: 'Slash02.png', muzzle: 'Flash01.png', element: 'shadow', skills: ['dagger_phantom_dash', 'dagger_shadow_stab'] },
  { id: 'styproj.frost', vfxRef: 'VFX-STY-FROST', name: 'Frost', tex: 'Snowflakes_1.png', trail: 'Trail05.png', hit: 'Glow01.png', muzzle: 'Glow01.png', element: 'frost', skills: ['staff_blizzard'] },
  { id: 'styproj.flower', vfxRef: 'VFX-STY-FLOWER', name: 'Flower', tex: 'Flower.png', trail: 'Trail06.png', hit: 'Leaf_4.png', muzzle: 'Flare01.png', element: 'nature', skills: ['t0_staff_healing_sprout'] },
  { id: 'styproj.star', vfxRef: 'VFX-STY-STAR', name: 'Star', tex: 'Star_1.png', trail: 'Trail09.png', hit: 'Flare01.png', muzzle: 'Glow01.png', element: 'holy', skills: ['staff_divine_wave'] },
  { id: 'styproj.electric_shadow', vfxRef: 'VFX-STY-ELECSHADOW', name: 'Electric Shadow', tex: 'Lightning01.png', trail: 'Trail08.png', hit: 'Flash01.png', muzzle: 'Flash01.png', element: 'shadow', skills: ['spear_phantom'] },
  { id: 'styproj.electric', vfxRef: 'VFX-STY-ELECTRIC', name: 'Electric', tex: 'Lightning01.png', trail: 'Trail02.png', hit: 'Flash01.png', muzzle: 'Flash01.png', element: 'lightning', skills: ['staff_thundergods_judgment'] },
  { id: 'styproj.shuriken', vfxRef: 'VFX-STY-SHURIKEN', name: 'Shuriken', tex: 'Shape03.png', trail: 'Trail04.png', hit: 'Slash01.png', muzzle: 'Flash01.png', element: 'physical', skills: ['dagger_raging_blades'] },
  { id: 'styproj.smoke', vfxRef: 'VFX-STY-SMOKE', name: 'Smoke', tex: 'Smoke_1.png', trail: 'Trail09.png', hit: 'Smoke_3.png', muzzle: 'Smoke_2.png', element: 'physical', skills: ['t0_wand_practice_bolt'] },
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
  physical: 'styproj.dagger',
};

const BY_ID = new Map(STYLIZED_PROJECTILES.map((p) => [p.id, p]));

function pack(row, kind) {
  if (!row) return null;
  const slash = kind === 'slash' || kind === 'dash';
  return {
    id: row.id,
    vfxRef: row.vfxRef,
    head: row.tex,
    trail: slash ? null : row.trail,
    hit: slash ? 'Slash01.png' : row.hit,
    muzzle: row.muzzle,
    name: row.name,
  };
}

/** Overlay spec for a catalog skill. Never invents skill ids. */
export function overlayForSkill(skillId, kind, element) {
  const fromSkill = BY_SKILL.get(skillId);
  if (fromSkill) return pack(fromSkill, kind);
  if (kind === 'slash' || kind === 'dash') {
    return {
      id: 'styhit.head_mesh',
      vfxRef: 'VFX-STYHIT-SLASH',
      head: 'Slash01.png',
      trail: kind === 'dash' ? 'Trail08.png' : null,
      hit: 'Slash02.png',
      muzzle: 'Flash01.png',
      name: 'Slash',
    };
  }
  if (kind === 'nova' || kind === 'zone') {
    return {
      id: 'styhit.smoke',
      vfxRef: 'VFX-STYHIT-SMOKE',
      head: 'Smoke_1.png',
      trail: null,
      hit: 'Smoke_3.png',
      muzzle: 'Glow01.png',
      name: 'Burst',
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
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), tintMat(map, color, 0.88));
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
  const [trailMap, headMap] = await Promise.all([
    loadStylizedTex(overlay.trail),
    loadStylizedTex(overlay.head),
  ]);
  const bits = {};
  if (trailMap) {
    bits.trail = makeTrailRibbon(trailMap, color);
    root.add(bits.trail);
  }
  if (headMap) {
    bits.head = makeHeadSprite(headMap, color);
    root.add(bits.head);
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
