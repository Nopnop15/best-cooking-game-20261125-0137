// Warung Kilat — all sound is synthesized with WebAudio oscillators.
// No audio files are loaded; the context starts on the first user gesture.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol = 0.1) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(gain).connect(c.destination);
    src.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    click() { tone(660, 0.06, 'square', 0.05); },
    pickup() { tone(520, 0.07, 'sine', 0.1, 0, 780); },
    drop() { tone(300, 0.08, 'sine', 0.1, 0, 210); },
    chop() { noiseBurst(0.09, 0.16); tone(180, 0.05, 'square', 0.06); },
    chopDone() { tone(740, 0.09, 'triangle', 0.12); tone(990, 0.12, 'triangle', 0.1, 0.08); },
    sizzle() { noiseBurst(0.25, 0.05); },
    cooked() { tone(880, 0.1, 'sine', 0.12); tone(1174, 0.14, 'sine', 0.1, 0.09); },
    brew() { tone(420, 0.12, 'sine', 0.09, 0, 640); },
    serve() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.12, i * 0.08));
    },
    error() { tone(160, 0.18, 'sawtooth', 0.1, 0, 110); },
    orderIn() { tone(587, 0.08, 'sine', 0.09); tone(880, 0.1, 'sine', 0.08, 0.07); },
    missed() { tone(392, 0.2, 'sawtooth', 0.08, 0, 262); },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.16));
    },
  };
}
