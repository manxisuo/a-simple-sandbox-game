export interface AudioMixSettings {
  muted: boolean;
  masterVolume: number;
  ambientVolume: number;
  effectsVolume: number;
}

interface AudioWorldState {
  daylight: number;
  anomalyInside: boolean;
  anomalyIntensity: number;
}

interface AudioWeatherState {
  type: 'clear' | 'drizzle' | 'rain' | 'storm' | 'mist';
  intensity: number;
}

export class AudioSystem {
  private context?: AudioContext;
  private masterGain?: GainNode;
  private ambientGain?: GainNode;
  private effectsGain?: GainNode;
  private windGain?: GainNode;
  private nightGain?: GainNode;
  private anomalyGain?: GainNode;
  private rainGain?: GainNode;
  private mistGain?: GainNode;
  private settings: AudioMixSettings;
  private worldState: AudioWorldState = { daylight: 1, anomalyInside: false, anomalyIntensity: 1 };
  private weatherState: AudioWeatherState = { type: 'clear', intensity: 0 };

  constructor(settings: AudioMixSettings) {
    this.settings = { ...settings };
    const unlock = (): void => { void this.ensureContext(); };
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
  }

  setSettings(settings: AudioMixSettings): void {
    this.settings = { ...settings };
    this.applyMix();
  }

  setWorldState(state: AudioWorldState): void {
    this.worldState = { ...state };
    this.applyAmbience();
  }

  setWeatherState(state: AudioWeatherState): void {
    this.weatherState = { ...state };
    this.applyAmbience();
  }

  handleEvent(event: { type: string }): void {
    if (!this.context || this.context.state !== 'running' || this.settings.muted) return;

    switch (event.type) {
      case 'companion.petted':
        this.tone(520, 0.18, 0.045, 'sine'); this.tone(660, 0.22, 0.034, 'sine', 0.08); break;
      case 'memory.touched':
        this.tone(245, 0.42, 0.055, 'sine'); this.tone(367, 0.55, 0.035, 'triangle', 0.05); break;
      case 'memory.resonance':
        this.tone(164, 1.1, 0.07, 'sine'); this.tone(246, 1.35, 0.05, 'sine', 0.08); this.tone(369, 1.5, 0.035, 'triangle', 0.16); break;
      case 'resonance.pulse':
        this.sweep(105, 420, 0.85, 0.085, 'sine'); this.tone(210, 1.1, 0.04, 'triangle', 0.08); break;
      case 'bloom.awakened':
        this.tone(620, 0.5, 0.035, 'sine'); this.tone(930, 0.72, 0.025, 'sine', 0.09); break;
      case 'bloom.slept': this.sweep(520, 280, 0.45, 0.025, 'sine'); break;
      case 'creature.greeted': this.sweep(680, 980, 0.28, 0.025, 'triangle'); break;
      case 'anomaly.entered':
        this.sweep(78, 132, 1.25, 0.065, 'sine'); this.tone(196, 1.6, 0.022, 'triangle', 0.12); break;
      case 'anomaly.exited': this.sweep(150, 84, 0.8, 0.04, 'sine'); break;
      case 'world.night-started': this.tone(196, 1.4, 0.018, 'sine'); break;
      case 'weather.thunder': this.createThunder(); break;
      default: break;
    }
  }

  private async ensureContext(): Promise<void> {
    if (!this.context) this.createGraph();
    if (!this.context) return;
    if (this.context.state !== 'running') await this.context.resume();
    this.applyMix(); this.applyAmbience();
  }

  private createGraph(): void {
    const context = new AudioContext();
    this.context = context;
    this.masterGain = context.createGain(); this.ambientGain = context.createGain(); this.effectsGain = context.createGain();
    this.windGain = context.createGain(); this.nightGain = context.createGain(); this.anomalyGain = context.createGain();
    this.rainGain = context.createGain(); this.mistGain = context.createGain();
    this.ambientGain.connect(this.masterGain); this.effectsGain.connect(this.masterGain);
    this.windGain.connect(this.ambientGain); this.nightGain.connect(this.ambientGain); this.anomalyGain.connect(this.ambientGain);
    this.rainGain.connect(this.ambientGain); this.mistGain.connect(this.ambientGain); this.masterGain.connect(context.destination);
    this.createWindLayer(context); this.createNightLayer(context); this.createAnomalyLayer(context);
    this.createRainLayer(context); this.createMistLayer(context);
    this.applyMix(); this.applyAmbience();
  }

  private createFilteredNoise(context: AudioContext, seconds: number, highpassHz: number, lowpassHz: number, destination: AudioNode, scale: number): void {
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < data.length; i += 1) {
      smooth = smooth * 0.93 + (Math.random() * 2 - 1) * 0.07;
      data[i] = smooth * scale;
    }
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = highpassHz; highpass.Q.value = 0.2;
    const lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = lowpassHz; lowpass.Q.value = 0.25;
    source.connect(highpass).connect(lowpass).connect(destination); source.start();
  }

  private createWindLayer(context: AudioContext): void {
    if (!this.windGain) return;
    const buffer = context.createBuffer(1, context.sampleRate * 7, context.sampleRate); const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i += 1) { brown = brown * 0.995 + (Math.random() * 2 - 1) * 0.005; data[i] = brown * 0.8; }
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 110; highpass.Q.value = 0.2;
    const lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 520; lowpass.Q.value = 0.25;
    const breathingGain = context.createGain(); breathingGain.gain.value = 0.55;
    const lfo = context.createOscillator(); const lfoDepth = context.createGain(); lfo.type = 'sine'; lfo.frequency.value = 0.055; lfoDepth.gain.value = 0.18;
    source.connect(highpass).connect(lowpass).connect(breathingGain).connect(this.windGain); lfo.connect(lfoDepth).connect(breathingGain.gain);
    source.start(); lfo.start();
  }

  private createNightLayer(context: AudioContext): void {
    if (!this.nightGain) return;
    const low = context.createOscillator(); const upper = context.createOscillator(); low.type = 'sine'; upper.type = 'sine'; low.frequency.value = 220; upper.frequency.value = 329.6;
    const lowGain = context.createGain(); const upperGain = context.createGain(); lowGain.gain.value = 0.08; upperGain.gain.value = 0.035;
    low.connect(lowGain).connect(this.nightGain); upper.connect(upperGain).connect(this.nightGain); low.start(); upper.start();
  }

  private createAnomalyLayer(context: AudioContext): void {
    if (!this.anomalyGain) return;
    const a = context.createOscillator(); const b = context.createOscillator(); a.type = b.type = 'sine'; a.frequency.value = 58; b.frequency.value = 87;
    const ga = context.createGain(); const gb = context.createGain(); ga.gain.value = 0.78; gb.gain.value = 0.32;
    const tremolo = context.createOscillator(); const depth = context.createGain(); tremolo.type = 'sine'; tremolo.frequency.value = 0.19; depth.gain.value = 0.18;
    a.connect(ga).connect(this.anomalyGain); b.connect(gb).connect(this.anomalyGain); tremolo.connect(depth).connect(gb.gain); a.start(); b.start(); tremolo.start();
  }

  private createRainLayer(context: AudioContext): void {
    if (!this.rainGain) return;
    // Broad but quiet rain texture; heavily band-limited so it reads as rainfall rather than harsh static.
    this.createFilteredNoise(context, 5, 700, 4300, this.rainGain, 0.55);
  }

  private createMistLayer(context: AudioContext): void {
    if (!this.mistGain) return;
    this.createFilteredNoise(context, 8, 180, 760, this.mistGain, 0.16);
  }

  private createThunder(): void {
    if (!this.context || !this.effectsGain) return;
    const now = this.context.currentTime;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 2.6, this.context.sampleRate); const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const t = i / this.context.sampleRate; data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.1) * (0.75 + Math.sin(t * 34) * 0.25);
    }
    const source = this.context.createBufferSource(); source.buffer = buffer;
    const lowpass = this.context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 420;
    const gain = this.context.createGain(); gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.09, now + 0.035); gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    source.connect(lowpass).connect(gain).connect(this.effectsGain); source.start(now); source.stop(now + 2.7);
  }

  private applyMix(): void {
    if (!this.context || !this.masterGain || !this.ambientGain || !this.effectsGain) return;
    const now = this.context.currentTime; const master = this.settings.muted ? 0 : this.clamp01(this.settings.masterVolume);
    this.masterGain.gain.setTargetAtTime(master, now, 0.04); this.ambientGain.gain.setTargetAtTime(this.clamp01(this.settings.ambientVolume), now, 0.08); this.effectsGain.gain.setTargetAtTime(this.clamp01(this.settings.effectsVolume), now, 0.04);
  }

  private applyAmbience(): void {
    if (!this.context || !this.windGain || !this.nightGain || !this.anomalyGain || !this.rainGain || !this.mistGain) return;
    const now = this.context.currentTime; const daylight = this.clamp01(this.worldState.daylight); const night = 1 - daylight;
    const anomaly = this.worldState.anomalyInside ? Math.min(1.45, Math.max(0.75, this.worldState.anomalyIntensity)) : 0;
    const weather = this.weatherState.type;
    const weatherIntensity = this.clamp01(this.weatherState.intensity);
    this.windGain.gain.setTargetAtTime((0.022 + daylight * 0.012 + night * 0.004) * (weather === 'storm' ? 1.7 : weather === 'rain' ? 1.25 : 1), now, 2.5);
    this.nightGain.gain.setTargetAtTime(night * 0.018, now, 2.8);
    this.anomalyGain.gain.setTargetAtTime(anomaly * 0.1, now, this.worldState.anomalyInside ? 0.7 : 1.2);
    const rainBase = weather === 'drizzle' ? 0.035 : weather === 'rain' ? 0.075 : weather === 'storm' ? 0.12 : 0;
    this.rainGain.gain.setTargetAtTime(rainBase * (0.65 + weatherIntensity * 0.35), now, 1.8);
    this.mistGain.gain.setTargetAtTime(weather === 'mist' ? 0.025 : 0, now, 2.8);
  }

  private tone(frequency: number, duration: number, gainAmount: number, type: OscillatorType, delay = 0): void {
    if (!this.context || !this.effectsGain) return;
    const now = this.context.currentTime + delay; const oscillator = this.context.createOscillator(); const gain = this.context.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount), now + Math.min(0.035, duration * 0.2)); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.effectsGain); oscillator.start(now); oscillator.stop(now + duration + 0.05);
  }

  private sweep(from: number, to: number, duration: number, gainAmount: number, type: OscillatorType): void {
    if (!this.context || !this.effectsGain) return;
    const now = this.context.currentTime; const oscillator = this.context.createOscillator(); const gain = this.context.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount), now + 0.04); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.effectsGain); oscillator.start(now); oscillator.stop(now + duration + 0.05);
  }

  private clamp01(value: number): number { return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)); }
}
