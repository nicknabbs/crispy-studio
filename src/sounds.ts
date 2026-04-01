let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

export function setMuted(m: boolean) { muted = m; }
export function isMuted(): boolean { return muted; }

export function ensureAudioReady() {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* audio unavailable */ }
}

export function playClick() {
  if (muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    const baseFreq = 700 + Math.random() * 300;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, c.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.06);
  } catch { /* */ }
}

export function playPurchase() {
  if (muted) return;
  try {
    const c = getCtx();
    [523, 659, 784].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sine';
      const t = c.currentTime + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  } catch { /* */ }
}

export function playAchievement() {
  if (muted) return;
  try {
    const c = getCtx();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'triangle';
      const t = c.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch { /* */ }
}

export function playFrenzy() {
  if (muted) return;
  try {
    const c = getCtx();
    [262, 330, 392, 524].forEach((freq) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      osc.frequency.setValueAtTime(freq * 1.02, c.currentTime + 0.2);
      gain.gain.setValueAtTime(0, c.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.5);
    });
  } catch { /* */ }
}

export function playOrderUp() {
  if (muted) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const utter = new SpeechSynthesisUtterance('Order up!');
    utter.rate = 1.3;
    utter.pitch = 1.1;
    utter.volume = 0.8;
    // Try to pick an energetic voice
    const voices = synth.getVoices();
    const preferred = voices.find(v => /Daniel|Alex|Samantha|Google US/i.test(v.name));
    if (preferred) utter.voice = preferred;
    synth.speak(utter);
  } catch { /* speech unavailable */ }
}

export function playButterCatch() {
  if (muted) return;
  try {
    const c = getCtx();
    const osc1 = c.createOscillator();
    const gain1 = c.createGain();
    osc1.connect(gain1);
    gain1.connect(c.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, c.currentTime);
    gain1.gain.setValueAtTime(0.12, c.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
    osc1.start(c.currentTime);
    osc1.stop(c.currentTime + 0.08);

    const osc2 = c.createOscillator();
    const gain2 = c.createGain();
    osc2.connect(gain2);
    gain2.connect(c.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1600, c.currentTime + 0.06);
    gain2.gain.setValueAtTime(0.12, c.currentTime + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.16);
    osc2.start(c.currentTime + 0.06);
    osc2.stop(c.currentTime + 0.16);
  } catch { /* */ }
}
