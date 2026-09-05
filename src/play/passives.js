/**
 * Role passives — tank soaks, caster glass + damage, ranger kiting, worge flex.
 * Applied on incoming hit / outgoing hurt. Not a second skill tree.
 */
export const ROLE_PASSIVES = {
  tank: {
    id: 'grudge_endurance',
    label: 'Grudge Endurance',
    taken: 0.82,
    dealt: 0.92,
    cover: false,
    taunt: true,
    parry: true,
    block: true,
    autoParry: true,
  },
  cast: {
    id: 'glass_cannon',
    label: 'Glass Cannon',
    taken: 1.18,
    dealt: 1.22,
    cover: true,
    heal: true,
  },
  kite: {
    id: 'skirmish',
    label: 'Skirmish',
    taken: 0.94,
    dealt: 1.08,
    cover: true,
    movingTaken: 0.82,
    los: true,
  },
  flex: {
    id: 'versatile',
    label: 'Versatile',
    taken: 0.92,
    dealt: 1.05,
    cover: true,
    utility: true,
  },
  heal: {
    id: 'sanctuary',
    label: 'Sanctuary',
    taken: 1.08,
    dealt: 0.88,
    cover: true,
    heal: true,
    dispel: true,
  },
  peel: {
    id: 'outlaw',
    label: 'Outlaw',
    taken: 0.96,
    dealt: 1.12,
    cover: true,
    stun: true,
  },
};

export function passiveFor(role) {
  return ROLE_PASSIVES[role] || ROLE_PASSIVES.flex;
}

export function incomingScale(role, moving = false) {
  const p = passiveFor(role);
  if (moving && p.movingTaken) return p.movingTaken;
  return p.taken;
}

export function outgoingScale(role) {
  return passiveFor(role).dealt;
}
