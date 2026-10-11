// A small, deterministic animation score. Times are normalized, angles radians,
// and hips are world-space anchors: reclining rotates about the pelvis, not feet.
export const BEDTIME_DURATION = 6400;
export const REACTION_DURATION = 1850;
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const between = (t, a, b) => ease((t - a) / (b - a));
const mix = (a, b, t) => a + (b - a) * t;

export function bedtimeFrame(progress, hip) {
  const t = clamp(progress), endY = .83 + hip[2], endZ = .84 - hip[1];
  // time, hipY, hipZ, body angle, thigh R/L, knee R/L, torso curl, support, tuck
  const keys = [
    [0, hip[1], hip[2], 0, 0, 0, 0, 0, 0, 0, 0],
    [.12, hip[1] - .055, .15, 0, -.30, -.27, .60, .56, .08, .25, 0],
    [.32, .84, .88, 0, -1.50, -1.46, 1.50, 1.47, .06, 1, 0],
    [.50, .90, .15, -.18, -1.45, -1.38, .12, .22, .16, .75, 0],
    [.72, endY + .025, endZ, -.98, -.62, -.54, .22, .18, .18, .35, .30],
    [.88, endY, endZ, -Math.PI / 2, 0, -.025, .06, .04, 0, 0, 1],
    [1, endY, endZ, -Math.PI / 2, 0, 0, 0, 0, 0, 0, 0],
  ];
  const next = keys.findIndex(key => key[0] >= t);
  const b = keys[Math.max(1, next)], a = keys[Math.max(0, next - 1)];
  const f = between(t, a[0], b[0]), values = a.map((n, i) => mix(n, b[i], f));
  return {
    hip: [hip[0] + .035 * Math.sin(t * Math.PI), values[1], values[2]],
    rootX: values[3], rootY: .10 * Math.sin(t * Math.PI),
    legR: values[4], legL: values[5], kneeR: values[6], kneeL: values[7], curl: values[8], support: values[9], tuck: values[10],
    sleep: between(t, .66, .98), eyes: between(t, .77, .98),
    blanket: between(t, .73, .98), dim: between(t, .26, .98),
    bedOffset: -1.55 * (1 - between(t, 0, .32)),
    phase: t < .32 ? 'sitting' : t < .50 ? 'legs-up' : t < .88 ? 'reclining' : t < 1 ? 'tucking-in' : 'sleep',
  };
}

export function reactionFrame(elapsed) {
  const t = clamp(elapsed / REACTION_DURATION);
  const envelope = Math.sin(t * Math.PI) ** 2;
  return { giggle: envelope * Math.sin(t * Math.PI * 7), eyes: envelope * .96, active: elapsed >= 0 && elapsed < REACTION_DURATION };
}

export function gazeFor(profile, point) {
  const dx = point[0] - profile.head[0], down = profile.head[1] - point[1];
  return { yaw: Math.max(-.46, Math.min(.46, dx * 1.65)), pitch: Math.max(.07, Math.min(.52, .17 + down * .9)) };
}

// Quiet waiting gestures with pauses between them. Side glances are suppressed
// by the controller while the patient is choosing or placing equipment.
export function idleFrame(milliseconds, offset = 0) {
  const seconds = milliseconds / 1000 + offset, t = ((seconds % 23) + 23) % 23;
  const pulse = (start, duration) => t < start || t > start + duration ? 0 : Math.sin((t - start) / duration * Math.PI) ** 2;
  return {
    yaw: .16 * pulse(2, 3.2) - .14 * pulse(12, 3.8),
    pitch: .055 * pulse(6, 2.4),
    headTilt: .05 * pulse(16, 3.4) - .035 * pulse(3, 2.5),
    sway: .012 * Math.sin(seconds * .65),
    shoulders: .035 * pulse(18, 3),
    blink: Math.max(pulse(4.1, .30), pulse(10.3, .32), pulse(10.85, .27), pulse(20.1, .34)),
  };
}

export const REJECTION_DURATION = 850;
// Two small side-to-side turns, starting and settling at the current gaze.
export function rejectionFrame(elapsed) {
  const t = clamp(elapsed / REJECTION_DURATION), active = elapsed >= 0 && elapsed < REJECTION_DURATION;
  return { yaw: active ? .24 * Math.sin(t * Math.PI * 4) * Math.sin(t * Math.PI) : 0, active };
}
