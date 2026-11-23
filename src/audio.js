// audio.js - 100% Procedural Web Audio Engine (Vehicle RPM, Screech, Nitro, Siren, SFX & Synthwave Radio)

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    this.isMuted = false;
    this.isMusicPlaying = true;
    this.initialized = false;

    // Engine sound nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;

    // Screech sound nodes
    this.screechSource = null;
    this.screechGain = null;
    this.screechFilter = null;

    // Nitro sound nodes
    this.nitroGain = null;
    this.nitroSource = null;

    // Police Siren nodes
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLFO = null;

    // Aerodynamic Wind Rush nodes
    this.windSource = null;
    this.windGain = null;
    this.windFilter = null;

    // Last throttle state for turbo blow-off detection
    this.lastThrottleState = false;

    // Synthwave Radio state
    this.radioTimer = null;
    this.stepIndex = 0;
    this.bpm = 124;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.setupEngineSynth();
      this.setupScreechSynth();
      this.setupNitroSynth();
      this.setupSirenSynth();
      this.setupWindSynth();

      this.initialized = true;

      // Start background synthwave driving rhythm
      this.startSynthwaveRadio();
    } catch (e) {
      console.warn('AudioContext not allowed yet or not supported:', e);
    }
  }

  resume() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  toggleMusic() {
    this.isMusicPlaying = !this.isMusicPlaying;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.isMusicPlaying ? 0.35 : 0, this.ctx.currentTime);
    }
    return this.isMusicPlaying;
  }

  setupEngineSynth() {
    // Dual saw/triangle oscillators routed through lowpass filter
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  setupScreechSynth() {
    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.screechSource = this.ctx.createBufferSource();
    this.screechSource.buffer = noiseBuffer;
    this.screechSource.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.screechSource.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.sfxGain);

    this.screechSource.start();
  }

  setupNitroSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.nitroSource = this.ctx.createBufferSource();
    this.nitroSource.buffer = noiseBuffer;
    this.nitroSource.loop = true;

    const nitroFilter = this.ctx.createBiquadFilter();
    nitroFilter.type = 'lowpass';
    nitroFilter.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.nitroSource.connect(nitroFilter);
    nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.sfxGain);

    this.nitroSource.start();
  }

  setupSirenSynth() {
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.setValueAtTime(700, this.ctx.currentTime);

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // LFO for wailing effect
    this.sirenLFO = this.ctx.createOscillator();
    this.sirenLFO.frequency.setValueAtTime(2.2, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);

    this.sirenLFO.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);

    this.sirenOsc.start();
    this.sirenLFO.start();
  }

  setupWindSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    // Pinkish noise for smoother rush
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.6;
    }

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxGain);

    this.windSource.start();
  }

  updateEngine(rpm, isDrifting, isNitro, wantedLevel, playerIsPolice = false, speed = 0, isBurnout = false, throttle = false) {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Modulate Engine RPM Pitch
    const normalizedRPM = Math.max(1000, Math.min(8500, rpm));
    const targetFreq1 = 32 + (normalizedRPM / 8000) * 110;
    const targetFreq2 = targetFreq1 * 0.5;
    const filterCutoff = 240 + (normalizedRPM / 8000) * 1250;

    this.engineOsc1.frequency.setTargetAtTime(targetFreq1, t, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq2, t, 0.04);
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, t, 0.04);

    // 2. Modulate Drift / Burnout Screech
    if (isBurnout) {
      this.screechGain.gain.setTargetAtTime(0.32, t, 0.03);
      this.screechFilter.frequency.setTargetAtTime(950 + Math.random() * 200, t, 0.04);
    } else if (isDrifting) {
      this.screechGain.gain.setTargetAtTime(0.24, t, 0.04);
      this.screechFilter.frequency.setTargetAtTime(1150 + Math.random() * 300, t, 0.05);
    } else {
      this.screechGain.gain.setTargetAtTime(0.0, t, 0.08);
    }

    // 3. Modulate Nitro Roar
    if (isNitro) {
      this.nitroGain.gain.setTargetAtTime(0.32, t, 0.04);
    } else {
      this.nitroGain.gain.setTargetAtTime(0.0, t, 0.08);
    }

    // 4. Modulate High-Speed Aerodynamic Wind Rush
    if (this.windGain && this.windFilter) {
      const absSpeed = Math.abs(speed);
      if (absSpeed > 120) {
        const windRatio = Math.min(1.0, (absSpeed - 120) / 450);
        this.windGain.gain.setTargetAtTime(0.25 * windRatio, t, 0.1);
        this.windFilter.frequency.setTargetAtTime(400 + windRatio * 900, t, 0.1);
      } else {
        this.windGain.gain.setTargetAtTime(0.0, t, 0.15);
      }
    }

    // 5. Turbo Blow-Off Valve (Trigger on sudden lift-off after high throttle/revs)
    if (this.lastThrottleState && !throttle && normalizedRPM > 4500 && !isBurnout) {
      this.playBlowOff();
    }
    this.lastThrottleState = throttle;

    // 6. Modulate Police Siren
    if (wantedLevel > 0 || playerIsPolice) {
      this.sirenGain.gain.setTargetAtTime(0.18, t, 0.1);
    } else {
      this.sirenGain.gain.setTargetAtTime(0.0, t, 0.2);
    }
  }

  playExhaustPop() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Number of crackles (1 to 3 micro pops)
    const popCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < popCount; i++) {
      const popDelay = i * (0.04 + Math.random() * 0.03);
      const popTime = t + popDelay;

      // 1. Noise burst (sharp metallic snap)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 + Math.random() * 400, popTime);
      filter.Q.setValueAtTime(3.0, popTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, popTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.06);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(popTime);

      // 2. Low-frequency punch (chest thump)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(140 + Math.random() * 30, popTime);
      subOsc.frequency.exponentialRampToValueAtTime(35, popTime + 0.07);

      subGain.gain.setValueAtTime(0.5, popTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.07);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);
      subOsc.start(popTime);
      subOsc.stop(popTime + 0.08);
    }
  }

  playBlowOff() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;

    // High frequency turbo pressure release hiss with subtle flutter ("psshh-tsu-tsu")
    const duration = 0.32;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const flutter = 1.0 + 0.25 * Math.sin(i * 0.04);
      data[i] = (Math.random() * 2 - 1) * flutter * Math.exp(-i / (bufferSize * 0.45));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(1800, t + duration);
    filter.Q.setValueAtTime(3.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(t);
  }

  playCrash(intensity = 0.5) {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    gain.gain.setValueAtTime(Math.min(0.7, 0.2 + intensity * 0.5), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  playCash() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [987.77, 1318.51]; // B5, E6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.25, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.26);
    });
  }

  playNitroChime() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.2); // C6
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.31);
  }

  playCheckpoint() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.setValueAtTime(1174.66, t + 0.08); // D6
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  playHorn() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    o1.type = 'sawtooth';
    o2.type = 'sawtooth';
    o1.frequency.setValueAtTime(392, t); // G4
    o2.frequency.setValueAtTime(493.88, t); // B4

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    o1.connect(gain);
    o2.connect(gain);
    gain.connect(this.sfxGain);

    o1.start(t);
    o2.start(t);
    o1.stop(t + 0.36);
    o2.stop(t + 0.36);
  }

  playWhoosh() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.2);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.51);
  }

  playThud(vol = 0.5) {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);
    gain.gain.setValueAtTime(vol * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  playSplash() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  playConeHit() {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  // --- Procedural Synthwave Cyber Radio Generator ---
  startSynthwaveRadio() {
    const stepDuration = 60 / this.bpm / 4; // 16th note interval
    const bassline = [
      65.41, 65.41, 65.41, 65.41, // C2
      77.78, 77.78, 77.78, 77.78, // Eb2
      87.31, 87.31, 87.31, 87.31, // F2
      58.27, 58.27, 65.41, 77.78  // Bb1 - C2
    ];

    setInterval(() => {
      if (!this.initialized || !this.ctx || !this.isMusicPlaying || this.isMuted) return;
      const t = this.ctx.currentTime;
      const step = this.stepIndex % 16;

      // 1. Kick on 0, 4, 8, 12 (Four-on-the-floor beat)
      if (step % 4 === 0) {
        this.synthKick(t);
      }

      // 2. Snare / Clap on 4, 12
      if (step === 4 || step === 12) {
        this.synthSnare(t);
      }

      // 3. Hi-hat on every off-beat
      if (step % 2 === 1) {
        this.synthHiHat(t);
      }

      // 4. Synthwave Bassline Arpeggio
      const noteFreq = bassline[step];
      this.synthBassNote(t, noteFreq, stepDuration * 0.85);

      this.stepIndex++;
    }, stepDuration * 1000);
  }

  synthKick(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.09);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  synthSnare(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  synthHiHat(t) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, t);
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  synthBassNote(t, freq, duration) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + duration);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + duration + 0.01);
  }
}
