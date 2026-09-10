/**
 * iOS Safari Web Audio unlock.
 * Safari keeps AudioContext suspended until a user gesture; call unlock()
 * from the first tap so later SFX (or Three Audio) can start immediately.
 */
let ctx = null;
let unlocked = false;

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

export function unlockAudio() {
  if (unlocked) return;
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
    } catch (_) {
      /* ignore */
    }
  };

  kick();
  if (ac.state === 'suspended') {
    ac.resume().then(kick).catch(() => {});
  }
}

export function getAudioContext() {
  return ctx;
}
