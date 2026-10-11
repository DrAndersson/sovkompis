import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlacementAudio } from '../dist/placement-audio.js';

function fakeContext(state = 'running') {
  const voices = [], gains = [];
  return {
    state, currentTime: 1, destination: {}, voices, gains,
    async resume() { this.state = 'running'; },
    createOscillator() {
      const voice = { frequency: { setValueAtTime(value) { voice.hz = value; } }, connect() {}, disconnect() { voice.disconnected = true; }, start(at) { voice.startAt = at; }, stop(at) { voice.stopAt = at; voice.stopped = true; } };
      voices.push(voice); return voice;
    },
    createGain() {
      const gain = { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() { gain.disconnected = true; } };
      gains.push(gain); return gain;
    },
  };
}
test('Correct cue rises, retry cue descends; cues are brief and replaced cleanly', async () => {
  const context = fakeContext('suspended'), audio = createPlacementAudio(() => context);
  assert.equal(await audio.play(true), true);
  assert.equal(context.state, 'running');
  assert.ok(context.voices[0].hz < context.voices[1].hz && context.voices[1].hz < context.voices[2].hz);
  assert.ok(context.voices[2].stopAt - context.currentTime < .5);
  assert.equal(await audio.play(false), true);
  assert.ok(context.voices.slice(0, 3).every(v => v.disconnected));
  assert.ok(context.voices[3].hz > context.voices[4].hz);
  context.voices[3].onended();
  assert.ok(context.gains[3].disconnected);
  audio.setEnabled(false);
  assert.ok(context.voices[4].disconnected);
  assert.equal(await audio.play(true), false);
  assert.equal(context.voices.length, 5);
});
test('Mute while audio unlock is pending prevents a delayed cue', async () => {
  const context = fakeContext('suspended'); let unlock;
  context.resume = () => new Promise(resolve => { unlock = () => { context.state = 'running'; resolve(); }; });
  const audio = createPlacementAudio(() => context), pending = audio.play(true);
  audio.setEnabled(false); unlock();
  assert.equal(await pending, false); assert.equal(context.voices.length, 0);
  audio.setEnabled(true); assert.equal(await audio.play(false), true);
});
test('Unavailable or blocked audio leaves placement usable', async () => {
  assert.equal(await createPlacementAudio(() => null).play(true), false);
  const context = fakeContext('suspended'); context.resume = async () => { throw new Error('Blocked'); };
  assert.equal(await createPlacementAudio(() => context).play(false), false);
  assert.equal(context.voices.length, 0);
});
