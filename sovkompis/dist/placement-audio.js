// Short, gentle cues synthesized locally. No downloads or microphone access.
export function createPlacementAudio(createContext = () => {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  return AudioContext ? new AudioContext() : null;
}) {
  let context, enabled = true, version = 0;
  const voices = new Set();
  function stop() {
    version++;
    for (const voice of voices) {
      try { voice.oscillator.stop(); } catch { /* Already ended. */ }
      voice.oscillator.disconnect(); voice.gain.disconnect();
    }
    voices.clear();
  }
  return {
    setEnabled(value) { enabled = Boolean(value); if (!enabled) stop(); },
    async play(correct) {
      stop();
      if (!enabled) return false;
      const request = version;
      try {
        context ||= createContext();
        if (!context || context.state === 'closed') return false;
        // Called directly from click/pointerup so mobile browsers can unlock audio.
        if (context.state !== 'running') await context.resume();
        if (!enabled || request !== version || context.state !== 'running') return false;
        const notes = correct ? [523.25, 659.25, 783.99] : [293.66, 220];
        const start = context.currentTime + .01;
        for (const [index, frequency] of notes.entries()) {
          const oscillator = context.createOscillator(), gain = context.createGain();
          const at = start + index * .105, duration = .19;
          oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, at);
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(correct ? .07 : .055, at + .018);
          gain.gain.exponentialRampToValueAtTime(.001, at + duration - .015);
          gain.gain.linearRampToValueAtTime(0, at + duration);
          oscillator.connect(gain); gain.connect(context.destination);
          const voice = { oscillator, gain }; voices.add(voice);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(voice); };
          oscillator.start(at); oscillator.stop(at + duration + .01);
        }
        return true;
      } catch { if (request === version) stop(); return false; } // Visual feedback always remains available.
    },
    stop,
  };
}
