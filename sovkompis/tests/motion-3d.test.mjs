import test from 'node:test';
import assert from 'node:assert/strict';
import { bedtimeFrame, reactionFrame, REACTION_DURATION, gazeFor, idleFrame } from '../dist/motion-3d.js';
import { ANATOMY } from '../dist/rig-3d.js';

test('Bedtime bends the knees before reclining and ends in the established bed pose', () => {
  const hip = [0, .72, -.03], first = bedtimeFrame(0, hip), seated = bedtimeFrame(.32, hip), last = bedtimeFrame(1, hip);
  assert.deepEqual(first.hip, hip);
  assert.equal(first.rootX, 0);
  assert.equal(first.blanket, 0);
  assert.ok(seated.kneeR > 1 && seated.kneeL > 1);
  assert.ok(Math.abs(seated.rootX) < .1, 'sit upright before reclining');
  assert.equal(last.rootX, -Math.PI / 2);
  assert.equal(last.hip[1], .83 + hip[2]);
  assert.equal(last.hip[2], .84 - hip[1]);
  assert.equal(last.eyes, 1);
  assert.equal(last.blanket, 1);
  assert.equal(last.phase, 'sleep');
  for (let i = 0; i <= 100; i++) {
    const frame = bedtimeFrame(i / 100, hip);
    for (const value of Object.values(frame).flat()) if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
  assert.deepEqual(bedtimeFrame(-1, hip), first);
  assert.deepEqual(bedtimeFrame(2, hip), last);
});

test('Gaze follows the patient side and giggles settle without residual movement', () => {
  for (const profile of Object.values(ANATOMY)) {
    assert.ok(gazeFor(profile, profile.finger).yaw < 0);
    assert.ok(gazeFor(profile, profile.toe).yaw > 0);
    assert.ok(gazeFor(profile, profile.toe).pitch > gazeFor(profile, profile.nose).pitch);
  }
  assert.equal(reactionFrame(0).giggle, 0);
  assert.ok(Math.abs(reactionFrame(REACTION_DURATION / 2).giggle) > .5);
  assert.equal(reactionFrame(REACTION_DURATION).active, false);
  assert.ok(Math.abs(reactionFrame(REACTION_DURATION).giggle) < 1e-9);
});

test('Idle animation stays subtle and periodically blinks with resting intervals', () => {
  const frames = Array.from({ length: 2301 }, (_, i) => idleFrame(i * 10));
  assert.ok(frames.some(f => f.blink > .99));
  assert.ok(frames.filter(f => f.blink === 0).length > frames.length * .90);
  assert.ok(frames.some(f => f.yaw > .1) && frames.some(f => f.yaw < -.1));
  for (const f of frames) {
    assert.ok(Object.values(f).every(Number.isFinite));
    assert.ok(Math.abs(f.sway) <= .012 && Math.abs(f.headTilt) <= .05);
    assert.ok(f.blink >= 0 && f.blink <= 1);
  }
});
