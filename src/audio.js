/**
 * iOS Safari Web Audio unlock + tasteful speed whoosh.
 * Safari keeps AudioContext suspended until a user gesture; call unlock()
 * from the first tap so later SFX can start immediately.
 */
let ctx = null;
let unlocked = false;
let whoosh = null;

function getContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch (_) {
    ctx = null;
  }
  return ctx;
}

function makeNoiseBuffer(ac) {
  const len = Math.max(1, Math.floor((ac.sampleRate || 22050) * 1.5));
  const buffer = ac.createBuffer(1, len, ac.sampleRate || 22050);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.86 + white * 0.14;
    data[i] = last * 0.7;
  }
  return buffer;
}

function ensureWhoosh() {
  if (whoosh || !ctx) return whoosh;
  try {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 280;
    filter.Q.value = 0.7;
    const rumble = ctx.createOscillator();
    rumble.type = 'triangle';
    rumble.frequency.value = 46;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    const master = ctx.createGain();
    master.gain.value = 0;
    src.connect(filter);
    filter.connect(master);
    rumble.connect(rumbleGain);
    rumbleGain.connect(master);
    master.connect(ctx.destination);
    src.start(0);
    rumble.start(0);
    whoosh = { filter, rumble, rumbleGain, master };
  } catch (_) {
    whoosh = null;
  }
  return whoosh;
}

export function unlockAudio() {
  const ac = getContext();
  if (!ac) {
    unlocked = true;
    return;
  }

  const kick = () => {
    try {
      if (ac.state === 'suspended') ac.resume();
      const buffer = ac.createBuffer(1, 1, ac.sampleRate || 22050);
      const source = ac.createBufferSource();
      source.buffer = buffer;
      source.connect(ac.destination);
      source.start(0);
      unlocked = ac.state === 'running';
      if (unlocked) ensureWhoosh();
    } catch (_) {
      /* ignore */
    }
  };

  kick();
  if (ac.state === 'suspended') {
    ac.resume().then(kick).catch(() => {});
  }
}

export function updateEngine(speedNorm, boosting) {
  if (!unlocked) return;
  const w = ensureWhoosh();
  if (!w || !ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
    return;
  }
  const n = Math.max(0, Math.min(1.35, speedNorm || 0));
  const moving = n > 0.04;
  const target = moving ? 0.016 + n * 0.042 + (boosting ? 0.028 : 0) : 0;
  const now = ctx.currentTime;
  w.master.gain.setTargetAtTime(target, now, 0.08);
  w.filter.frequency.setTargetAtTime(220 + n * 1680 + (boosting ? 420 : 0), now, 0.07);
  w.rumble.frequency.setTargetAtTime(38 + n * 52 + (boosting ? 18 : 0), now, 0.1);
  w.rumbleGain.gain.setTargetAtTime(moving ? 0.012 + n * 0.02 : 0, now, 0.1);
}

export function getAudioContext() {
  return ctx;
}
