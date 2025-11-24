// Simple synthesizer for UI sounds
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
const audioCtx = new AudioContextClass();

// -- HELPER: Resume Context (Fixes mobile audio stopping after backgrounding) --
export const resumeAudioContext = async () => {
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.warn("Audio resume failed", e);
    }
  }
};

// -- DRUM SYNTHESIS ENGINE --

const createNoiseBuffer = () => {
  const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

let noiseBuffer: AudioBuffer | null = null;

const playKick = (time: number) => {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

  osc.start(time);
  osc.stop(time + 0.5);
};

const playSnare = (time: number) => {
  // 1. Noise part (the rattle)
  if (!noiseBuffer) noiseBuffer = createNoiseBuffer();
  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;
  const noiseGain = audioCtx.createGain();

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  noiseGain.gain.setValueAtTime(0.8, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  noiseSrc.start(time);
  noiseSrc.stop(time + 0.2);

  // 2. Tonal part (the drum shell)
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);

  osc.frequency.setValueAtTime(250, time);
  oscGain.gain.setValueAtTime(0.4, time);
  oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  osc.start(time);
  osc.stop(time + 0.1);
};

const playHiHat = (time: number) => {
  if (!noiseBuffer) noiseBuffer = createNoiseBuffer();
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 8000;

  const gain = audioCtx.createGain();
  
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0.6, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

  src.start(time);
  src.stop(time + 0.05);
};

const playTom = (time: number) => {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.frequency.setValueAtTime(200, time);
  osc.frequency.exponentialRampToValueAtTime(100, time + 0.2);

  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

  osc.start(time);
  osc.stop(time + 0.2);
};

export const playSound = (type: 'correct' | 'wrong' | 'tap' | 'swipe' | 'beat' | 'breath' | 'kick' | 'snare' | 'hihat' | 'tom'): (() => void) => {
  // Robust resume check
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(e => console.warn(e));
  }
  
  const now = audioCtx.currentTime;

  // Direct routing to new drum synth
  if (type === 'kick') { playKick(now); return () => {}; }
  if (type === 'snare') { playSnare(now); return () => {}; }
  if (type === 'hihat') { playHiHat(now); return () => {}; }
  if (type === 'tom') { playTom(now); return () => {}; }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  switch (type) {
    case 'correct':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(500, now);
      oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
    case 'wrong':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.linearRampToValueAtTime(100, now + 0.2);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
    case 'tap':
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      oscillator.start(now);
      oscillator.stop(now + 0.05);
      break;
    case 'swipe':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.linearRampToValueAtTime(600, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;
    case 'beat': // Generic Woodblock (Fallback)
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(800, now); 
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;
    case 'breath': 
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.linearRampToValueAtTime(250, now + 2);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 2);
      gainNode.gain.linearRampToValueAtTime(0, now + 4);
      oscillator.start(now);
      oscillator.stop(now + 4);
      break;
  }

  // Return cancellation function
  return () => {
      try {
          const cancelTime = audioCtx.currentTime;
          // Quick fade out to avoid clicking
          gainNode.gain.cancelScheduledValues(cancelTime);
          gainNode.gain.setValueAtTime(gainNode.gain.value, cancelTime);
          gainNode.gain.linearRampToValueAtTime(0, cancelTime + 0.1);
          oscillator.stop(cancelTime + 0.1);
      } catch (e) {
          // ignore if already stopped
      }
  };
};

export interface BeatEvent {
    timeOffset: number; // ms from start
    type: 'kick' | 'snare' | 'hihat' | 'tom';
}

export const playRhythmPattern = (events: BeatEvent[], onComplete?: () => void) => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => console.warn(e));
    }

    const now = audioCtx.currentTime;
    let lastTime = 0;

    events.forEach(event => {
        const time = now + (event.timeOffset / 1000);
        lastTime = Math.max(lastTime, event.timeOffset);
        
        if (event.type === 'kick') playKick(time);
        else if (event.type === 'snare') playSnare(time);
        else if (event.type === 'hihat') playHiHat(time);
        else if (event.type === 'tom') playTom(time);
    });

    setTimeout(() => {
        if (onComplete) onComplete();
    }, lastTime + 500); // Wait a bit after last note
};

export const playNote = (index: number) => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => console.warn(e));
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const frequencies = [261.63, 329.63, 392.00, 523.25]; 
    const freq = frequencies[index % 4] || 261.63;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
};