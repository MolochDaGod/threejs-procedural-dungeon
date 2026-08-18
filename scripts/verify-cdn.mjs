/**
 * HEAD-check baked dungeon URLs. Exit 1 if a required asset is missing.
 */
const CDN = 'https://assets.grudge-studio.com';
const REQUIRED = [
  `${CDN}/models/dungeons/warlords-dungeon-kit.json`,
  `${CDN}/asset-packs/toon-rts-characters/glb/characters/human.glb`,
  `${CDN}/asset-packs/toon-rts-characters/glb/characters/orc.glb`,
  `${CDN}/asset-packs/toon-rts-characters/glb/characters/undead.glb`,
  'https://combat.grudge-studio.com/models/toon-clips/wk-knight.glb',
  `${CDN}/asset-packs/toon-rts-characters/glb/anim_idle.glb`,
  `${CDN}/asset-packs/toon-rts-characters/glb/anim_walk.glb`,
  `${CDN}/asset-packs/toon-rts-characters/glb/anim_attack.glb`,
  `${CDN}/asset-packs/toon-rts-characters/glb/anim_death.glb`,
  `${CDN}/game-assets/glb/kaykit/gltf/torch.glb`,
  `${CDN}/game-assets/glb/kaykit/gltf/chest_rare.glb`,
  `${CDN}/game-assets/glb/kaykit/gltf/wall.glb`,
  `${CDN}/models/caves/2cave.glb`,
];

const results = [];
for (const url of REQUIRED) {
  const res = await fetch(url, { method: 'HEAD' });
  const ok = res.ok;
  results.push({ url, status: res.status, ok });
  console.log(`${ok ? 'OK ' : 'FAIL'} ${res.status}  ${url}`);
}
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n${failed.length} CDN miss(es)`);
  process.exit(1);
}
console.log(`\n${results.length} CDN assets ready`);
