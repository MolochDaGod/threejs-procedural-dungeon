/** Slot 8 mount picker. Speed on the same Rapier CCT — no second controller. */
export const MOUNTS = [
  { id: 'none', name: 'Dismount', speed: 1 },
  { id: 'warhorse', name: 'Warhorse', speed: 1.45 },
  { id: 'wolf', name: 'Battle Wolf', speed: 1.38 },
  { id: 'raptor', name: 'Raptor', speed: 1.52 },
];

export function mountById(id) {
  return MOUNTS.find((m) => m.id === id) || MOUNTS[0];
}
