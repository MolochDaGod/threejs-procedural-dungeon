/**
 * Lockpick skill-check — same contract as gameopen lockpick.ts.
 * Native web (not Skyrim SWF). Home islands are never lockpickable.
 */
export function lockpickParams(difficulty) {
  const d = Math.max(0, Math.min(100, difficulty));
  const sweetHalfWidth = 0.45 - (d / 100) * 0.37;
  const maxAttempts = d >= 70 ? 2 : d >= 40 ? 3 : 4;
  const holdSec = 0.55 + (d / 100) * 0.45;
  return { sweetHalfWidth, maxAttempts, holdSec };
}

function mulberry32(a) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createLockpickSession(challenge) {
  const p = lockpickParams(challenge.difficulty);
  const rand = mulberry32(
    (challenge.seed ?? Math.floor(Date.now() % 1e9) + [...(challenge.targetId || '')].reduce((s, c) => s + c.charCodeAt(0), 0)) | 0,
  );
  const sweetAngle = rand() * Math.PI * 2;
  return {
    challenge: { ...challenge, sweetHalfWidth: challenge.sweetHalfWidth ?? p.sweetHalfWidth },
    sweetAngle,
    sweetHalfWidth: challenge.sweetHalfWidth ?? p.sweetHalfWidth,
    attemptsLeft: p.maxAttempts,
    maxAttempts: p.maxAttempts,
    pinAngle: 0,
    status: 'active',
    holdProgress: 0,
    startedAt: Date.now(),
  };
}

export function angleDelta(a, b) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

export function pinInSweetZone(session) {
  return angleDelta(session.pinAngle, session.sweetAngle) <= session.sweetHalfWidth;
}

export function tickLockpickHold(session, dt, holding) {
  if (session.status !== 'active') return session;
  const { holdSec } = lockpickParams(session.challenge.difficulty);
  if (!holding || !pinInSweetZone(session)) {
    return { ...session, holdProgress: Math.max(0, session.holdProgress - dt * 1.2) };
  }
  const next = session.holdProgress + dt / holdSec;
  if (next >= 1) return { ...session, holdProgress: 1, status: 'success' };
  return { ...session, holdProgress: next };
}

export function attemptLockpickTumble(session) {
  if (session.status !== 'active') return session;
  if (pinInSweetZone(session) && session.holdProgress >= 0.85) {
    return { ...session, status: 'success', holdProgress: 1 };
  }
  if (pinInSweetZone(session)) {
    const next = Math.min(1, session.holdProgress + 0.35);
    if (next >= 1) return { ...session, holdProgress: 1, status: 'success' };
    return { ...session, holdProgress: next };
  }
  const left = session.attemptsLeft - 1;
  if (left <= 0) return { ...session, attemptsLeft: 0, status: 'failed', holdProgress: 0 };
  return { ...session, attemptsLeft: left, holdProgress: 0 };
}

export function setLockpickPinAngle(session, angle) {
  if (session.status !== 'active') return session;
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return { ...session, pinAngle: a };
}

export function cancelLockpick(session) {
  if (session.status !== 'active') return session;
  return { ...session, status: 'cancelled' };
}
