import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, DEFAULT_AVATAR, emptyProgress, sanitizeProgress, loadProgress, saveProgress, placeEquipment, completeRound, targetFor } from '../dist/model.js';

test('A wrong target never gives credit, and an item cannot score twice', () => {
  const wrong = placeEquipment([], 'cannula', 'thorax');
  assert.equal(wrong.correct, false);
  assert.deepEqual(wrong.placed, []);
  const right = placeEquipment([], 'cannula', 'cannula');
  const duplicate = placeEquipment(right.placed, 'cannula', 'cannula');
  assert.deepEqual(duplicate.placed, ['cannula']);
  assert.equal(duplicate.correct, false);
  assert.equal(placeEquipment([], 'unknown', 'unknown').correct, false);
});
test('All five distinct parts are needed, regardless of placement order', () => {
  let parts = [];
  for (const [i, e] of [...EQUIPMENT].reverse().entries()) {
    const result = placeEquipment(parts, e.id, e.id);
    assert.equal(result.complete, i === 4);
    parts = result.placed;
  }
});
test('Three completed rounds award 450 XP and unlock the outfit', () => {
  let p = emptyProgress();
  p.avatar.outfit = 'stars';
  assert.equal(sanitizeProgress(p).avatar.outfit, DEFAULT_AVATAR.outfit);
  for (let i = 0; i < 3; i++) p = completeRound(p);
  assert.equal(p.rounds, 3);
  assert.equal(p.xp, 450);
  assert.equal(sanitizeProgress(p).avatar.outfit, 'stars');
});
test('Progress survives reload and malformed storage fails safely', () => {
  let raw;
  const storage = { getItem: () => raw, setItem: (_, val) => { raw = val; } };
  let p = completeRound(emptyProgress());
  p.avatar.name = 'Nova';
  p.oximeterSite = 'toe';
  assert.equal(saveProgress(storage, p), true);
  assert.deepEqual(loadProgress(storage), p);
  raw = '{broken'; assert.deepEqual(loadProgress(storage), emptyProgress());
  assert.deepEqual(loadProgress(null), emptyProgress());
  assert.equal(saveProgress(null, p), false);
  assert.deepEqual(sanitizeProgress({ rounds: -1, avatar: { skin: 'bad', eyes: 'bad', outfit: 'stars' } }), emptyProgress());
});
test('Oximeter follows the selected finger/toe site without moving other sensors', () => {
  assert.deepEqual(targetFor(EQUIPMENT[3], 'toe'), { x: 59, y: 91 });
  assert.deepEqual(targetFor(EQUIPMENT[3], 'finger'), { x: 25, y: 65 });
  assert.deepEqual(targetFor(EQUIPMENT[4], 'toe'), EQUIPMENT[4].target);
});
