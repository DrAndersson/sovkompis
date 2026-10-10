import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, ECG_LEADS, ROUND_XP, DEFAULT_AVATAR, emptyProgress, sanitizeProgress, loadProgress, saveProgress, placeEquipment, completeRound, targetFor, availableTargets } from '../dist/model.js';

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
test('All eight distinct parts are needed, regardless of placement order', () => {
  assert.equal(EQUIPMENT.length, 8);
  let parts = [];
  for (const [i, e] of [...EQUIPMENT].reverse().entries()) {
    const result = placeEquipment(parts, e.id, e.id);
    assert.equal(result.complete, i === 7);
    parts = result.placed;
  }
});
test('Three completed rounds award 630 XP and unlock the outfit', () => {
  let p = emptyProgress();
  p.avatar.outfit = 'stars';
  assert.equal(sanitizeProgress(p).avatar.outfit, DEFAULT_AVATAR.outfit);
  for (let i = 0; i < 3; i++) p = completeRound(p);
  assert.equal(p.rounds, 3);
  assert.equal(ROUND_XP, 210);
  assert.equal(p.xp, 630);
  assert.equal(sanitizeProgress(p).avatar.outfit, 'stars');
});
test('Progress survives reload and malformed storage fails safely', () => {
  let raw;
  const storage = { getItem: () => raw, setItem: (_, val) => { raw = val; } };
  let p = completeRound(emptyProgress());
  p.avatar.name = 'Nova';
  p.avatar.hair = 'long';
  p.oximeterSite = 'toe';
  assert.equal(saveProgress(storage, p), true);
  assert.deepEqual(loadProgress(storage), p);
  raw = '{broken'; assert.deepEqual(loadProgress(storage), emptyProgress());
  assert.deepEqual(loadProgress(null), emptyProgress());
  assert.equal(saveProgress(null, p), false);
  assert.deepEqual(sanitizeProgress({ rounds: -1, avatar: { skin: 'bad', eyes: 'bad', outfit: 'stars' } }), emptyProgress());
});
test('Earlier XP and unlocked clothes survive the move from five to eight parts', () => {
  const legacy = { rounds: 3, xp: 450, avatar: { ...DEFAULT_AVATAR, outfit: 'stars' } };
  const restored = sanitizeProgress(legacy);
  assert.equal(restored.xp, 450);
  assert.equal(restored.avatar.outfit, 'stars');
  const completed = completeRound(restored);
  assert.equal(completed.rounds, 4);
  assert.equal(completed.xp, 660);
  assert.equal(sanitizeProgress(completed).xp, 660);
  assert.equal(sanitizeProgress({ rounds: 3 }).xp, 450);
});
test('The three ECG cables must each be placed correctly before completion', () => {
  let parts = EQUIPMENT.filter(e => e.kind !== 'ecg').map(e => e.id);
  assert.equal(parts.length, 5);
  assert.equal(placeEquipment(parts, 'ecg-right', 'ecg-left').correct, false);
  for (const [i, lead] of ECG_LEADS.entries()) {
    assert.ok(availableTargets(parts, lead.id).some(target => target.id === lead.id));
    const result = placeEquipment(parts, lead.id, lead.id);
    assert.equal(result.complete, i === 2);
    parts = result.placed;
  }
});
test('Every selected part has a reachable target, with ECG sites on the patient’s sides', () => {
  for (const item of EQUIPMENT) {
    assert.ok(availableTargets([], item.id).some(target => target.id === item.id));
  }
  assert.ok(ECG_LEADS[0].target.x < 50);
  assert.ok(ECG_LEADS[1].target.x > 50);
  assert.ok(ECG_LEADS[2].target.x > 50);
  assert.ok(ECG_LEADS[2].target.y > ECG_LEADS[1].target.y);
  assert.equal(availableTargets([], 'ecg-right').length, 3);
});
test('Oximeter follows the selected finger/toe site without moving other sensors', () => {
  assert.deepEqual(targetFor(EQUIPMENT[3], 'toe'), { x: 59, y: 91 });
  assert.deepEqual(targetFor(EQUIPMENT[3], 'finger'), { x: 25, y: 65 });
  assert.deepEqual(targetFor(EQUIPMENT[4], 'toe'), EQUIPMENT[4].target);
});

test('Both oximeter sites are available together, but award credit only once', () => {
  const targets = availableTargets([], 'oximeter').filter(t => t.id === 'oximeter');
  assert.deepEqual(targets.map(t => t.targetId), ['oximeter-finger', 'oximeter-toe']);
  assert.notDeepEqual(targetFor(targets[0], 'toe'), targetFor(targets[1], 'finger'));
  for (const target of targets) {
    assert.equal(placeEquipment([], 'thorax', target.targetId).correct, false);
    const result = placeEquipment([], 'oximeter', target.targetId);
    assert.equal(result.correct, true);
    assert.equal(result.site, target.site);
    assert.deepEqual(result.placed, ['oximeter']);
    assert.equal(availableTargets(result.placed, 'cannula').some(t => t.id === 'oximeter'), false);
    for (const again of targets) assert.equal(placeEquipment(result.placed, 'oximeter', again.targetId).correct, false);
  }
});
