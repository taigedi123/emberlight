// All sound is synthesised with WebAudio — no audio files, so the game loads
// offline. One master gain, short oscillator voices for effects, and a quiet
// two-voice loop (a low pulse and a slow pentatonic pluck) for music. The
// context is only created after a user gesture, as browsers require.

export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (context) return true;
    try {
      const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioCtor) return false;
      context = new AudioCtor();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freqFrom, freqTo, seconds, type, volume = 1, when = 0, dest = null) {
    if (!ensure() || muted || !context) return;
    const at = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(28, freqFrom), at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(28, freqTo), at + seconds);
    gain.gain.setValueAtTime(0.55 * volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds);
    osc.connect(gain);
    gain.connect(dest ?? master);
    osc.start(at);
    osc.stop(at + seconds + 0.03);
  }

  function noise(seconds, volume = 0.5, when = 0) {
    if (!ensure() || muted || !context) return;
    const at = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(at);
  }

  // A minor-pentatonic pluck pattern over a slow root pulse; steps of 0.21 s.
  const PLUCK = [440, 0, 523.25, 0, 659.25, 0, 523.25, 392, 0, 440, 0, 587.33, 0, 659.25, 0, 0];
  function scheduleStep() {
    if (!context || muted) return;
    const step = musicStep % 16;
    if (step % 8 === 0) tone(110, 110, 0.5, 'sine', 0.9, 0, musicGain);
    if (step % 8 === 4) tone(164.81, 164.81, 0.4, 'sine', 0.6, 0, musicGain);
    const note = PLUCK[step];
    if (note) tone(note, note * 0.995, 0.22, 'triangle', 0.5, 0, musicGain);
    musicStep += 1;
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    startMusic() {
      if (!ensure() || musicTimer !== null) return;
      musicTimer = window.setInterval(scheduleStep, 210);
    },
    stopMusic() {
      if (musicTimer !== null) window.clearInterval(musicTimer);
      musicTimer = null;
    },
    shoot() {
      tone(880, 320, 0.07, 'square', 0.16);
    },
    hitEnemy() {
      tone(300, 190, 0.05, 'square', 0.2);
    },
    kill(combo) {
      const lift = Math.min(combo, 8) * 30;
      tone(240 + lift, 60, 0.16, 'sawtooth', 0.4);
      noise(0.12, 0.3);
    },
    pickup(combo) {
      const base = 620 + Math.min(combo, 8) * 45;
      tone(base, base * 1.5, 0.08, 'sine', 0.5);
      tone(base * 1.5, base * 2, 0.09, 'sine', 0.4, 0.05);
    },
    hurt() {
      tone(200, 48, 0.3, 'sawtooth', 0.7);
      noise(0.22, 0.5);
    },
    dash() {
      noise(0.13, 0.3);
      tone(280, 940, 0.13, 'sine', 0.35);
    },
    waveStart() {
      [392, 523.25, 659.25].forEach((f, i) => tone(f, f, 0.14, 'triangle', 0.6, i * 0.09));
    },
    bossWarn() {
      [146.83, 146.83, 220].forEach((f, i) => tone(f, f * 0.97, 0.24, 'sawtooth', 0.5, i * 0.2));
    },
    upgrade() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, f, 0.13, 'triangle', 0.55, i * 0.07));
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.6, i * 0.13));
    },
    gameOver() {
      [392, 329.63, 261.63, 196].forEach((f, i) => tone(f, f * 0.94, 0.3, 'triangle', 0.6, i * 0.17));
    },
  };
}
