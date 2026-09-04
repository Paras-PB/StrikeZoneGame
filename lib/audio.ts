// Synthesized WebAudio SFX — no assets needed
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(c: AudioContext, dur: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export function sfxShoot(suppressed = false, ads = false) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  // crack
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.12);
  const nf = c.createBiquadFilter();
  nf.type = "lowpass";
  nf.frequency.setValueAtTime(ads ? 2500 : 4500, t);
  nf.frequency.exponentialRampToValueAtTime(400, t + 0.1);
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.7, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  n.connect(nf).connect(ng).connect(master);
  n.start(t);
  n.stop(t + 0.13);
  // thump
  const o = c.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.09);
  const og = c.createGain();
  og.gain.setValueAtTime(0.5, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(og).connect(master);
  o.start(t);
  o.stop(t + 0.11);
}

export function sfxEnemyShoot() {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.1);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  n.connect(f).connect(g).connect(master);
  n.start(t);
}

export function sfxHit(kill = false) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(kill ? 1400 : 1100, t);
  o.frequency.exponentialRampToValueAtTime(kill ? 700 : 900, t + 0.07);
  const g = c.createGain();
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.09);
}

export function sfxHurt() {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.2);
  const g = c.createGain();
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.23);
}

export function sfxReload() {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  [0, 0.18, 0.55].forEach((dt, i) => {
    const o = c!.createOscillator();
    o.type = "square";
    o.frequency.value = i === 2 ? 900 : 400 + i * 150;
    const g = c!.createGain();
    g.gain.setValueAtTime(0.12, t + dt);
    g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.06);
    o.connect(g).connect(master!);
    o.start(t + dt);
    o.stop(t + dt + 0.07);
  });
}

export function sfxEmpty() {
  const c = ac();
  if (!c || !master) return;
  const o = c.createOscillator();
  o.type = "square";
  o.frequency.value = 2200;
  const g = c.createGain();
  g.gain.setValueAtTime(0.08, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
  o.connect(g).connect(master);
  o.start();
  o.stop(c.currentTime + 0.05);
}

export function sfxStep(sprint: boolean) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.05);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 500;
  const g = c.createGain();
  g.gain.setValueAtTime(sprint ? 0.14 : 0.09, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  n.connect(f).connect(g).connect(master);
  n.start(t);
}
