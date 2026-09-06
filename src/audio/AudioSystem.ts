import type { EntityEvent } from '../core/entities/types';

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

export class AudioSystem {
  private context?: AudioContext;
  private masterGain?: GainNode;
  private ambientGain?: GainNode;
  private effectsGain?: GainNode;
  private windGain?: GainNode;
  private nightGain?: GainNode;
  private anomalyGain?: GainNode;
  private settings: AudioMixSettings;
  private worldState: AudioWorldState = { daylight: 1, anomalyInside: false, anomalyIntensity: 1 };

  constructor(settings: AudioMixSettings) {
    this.settings = { ...settings };

    // Browsers require a user gesture before Web Audio can start. Keep the audio graph lazy and
    // renderer-independent game code unaware of this browser policy.
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

  handleEvent(event: EntityEvent): void {
    if (!this.context || this.context.state !== 'running' || this.settings.muted) return;

    switch (event.type) {
      case 'companion.petted':
        this.tone(520, 0.18, 0.045, 'sine');
        this.tone(660, 0.22, 0.034, 'sine', 0.08);
        break;
      case 'memory.touched':
        this.tone(245, 0.42, 0.055, 'sine');
        this.tone(367, 0.55, 0.035, 'triangle', 0.05);
        break;
      case 'memory.resonance':
        this.tone(164, 1.1, 0.07, 'sine');
        this.tone(246, 1.35, 0.05, 'sine', 0.08);
        this.tone(369, 1.5, 0.035, 'triangle', 0.16);
        break;
      case 'resonance.pulse':
        this.sweep(105, 420, 0.85, 0.085, 'sine');
        this.tone(210, 1.1, 0.04, 'triangle', 0.08);
        break;
      case 'bloom.awakened':
        this.tone(620, 0.5, 0.035, 'sine');
        this.tone(930, 0.72, 0.025, 'sine', 0.09);
        break;
      case 'bloom.slept':
        this.sweep(520, 280, 0.45, 0.025, 'sine');
        break;
      case 'creature.greeted':
        this.sweep(680, 980, 0.28, 0.025, 'triangle');
        break;
      case 'anomaly.entered':
        this.sweep(78, 132, 1.25, 0.065, 'sine');
        this.tone(196, 1.6, 0.022, 'triangle', 0.12);
        break;
      case 'anomaly.exited':
        this.sweep(150, 84, 0.8, 0.04, 'sine');
        break;
      case 'world.night-started':
        this.tone(196, 1.4, 0.018, 'sine');
        break;
      default:
        break;
    }
  }

  private async ensureContext(): Promise<void> {
    if (!this.context) this.createGraph();
    if (!this.context) return;
    if (this.context.state !== 'running') await this.context.resume();
    this.applyMix();
    this.applyAmbience();
  }

  private createGraph(): void {
    const context = new AudioContext();
    this.context = context;

    this.masterGain = context.createGain();
    this.ambientGain = context.createGain();
    this.effectsGain = context.createGain();
    this.windGain = context.createGain();
    this.nightGain = context.createGain();
    this.anomalyGain = context.createGain();

    this.ambientGain.connect(this.masterGain);
    this.effectsGain.connect(this.masterGain);
    this.windGain.connect(this.ambientGain);
    this.nightGain.connect(this.ambientGain);
    this.anomalyGain.connect(this.ambientGain);
    this.masterGain.connect(context.destination);

    this.createWindLayer(context);
    this.createNightLayer(context);
    this.createAnomalyLayer(context);

    this.applyMix();
    this.applyAmbience();
  }

  private createWindLayer(context: AudioContext): void {
    if (!this.windGain) return;

    // A quiet, slowly changing air bed rather than a constant white-noise "gale".
    const buffer = context.createBuffer(1, context.sampleRate * 7, context.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i += 1) {
      brown = brown * 0.995 + (Math.random() * 2 - 1) * 0.005;
      data[i] = brown * 0.8;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 110;
    highpass.Q.value = 0.2;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 520;
    lowpass.Q.value = 0.25;

    const breathingGain = context.createGain();
    breathingGain.gain.value = 0.55;

    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.055;
    lfoDepth.gain.value = 0.18;

    source.connect(highpass).connect(lowpass).connect(breathingGain).connect(this.windGain);
    lfo.connect(lfoDepth).connect(breathingGain.gain);
    source.start();
    lfo.start();
  }

  private createNightLayer(context: AudioContext): void {
    if (!this.nightGain) return;

    // Keep night mostly spacious and quiet. A very soft pair of upper partials avoids the
    // continuous sub-bass drone that can make an otherwise calm scene feel ominous.
    const low = context.createOscillator();
    const upper = context.createOscillator();
    low.type = 'sine';
    upper.type = 'sine';
    low.frequency.value = 220;
    upper.frequency.value = 329.6;

    const lowGain = context.createGain();
    const upperGain = context.createGain();
    lowGain.gain.value = 0.08;
    upperGain.gain.value = 0.035;
    low.connect(lowGain).connect(this.nightGain);
    upper.connect(upperGain).connect(this.nightGain);
    low.start();
    upper.start();
  }

  private createAnomalyLayer(context: AudioContext): void {
    if (!this.anomalyGain) return;
    const carrierA = context.createOscillator();
    const carrierB = context.createOscillator();
    carrierA.type = 'sine';
    carrierB.type = 'sine';
    carrierA.frequency.value = 58;
    carrierB.frequency.value = 87;

    const carrierGainA = context.createGain();
    const carrierGainB = context.createGain();
    carrierGainA.gain.value = 0.78;
    carrierGainB.gain.value = 0.32;

    const tremolo = context.createOscillator();
    const tremoloDepth = context.createGain();
    tremolo.type = 'sine';
    tremolo.frequency.value = 0.19;
    tremoloDepth.gain.value = 0.18;

    carrierA.connect(carrierGainA).connect(this.anomalyGain);
    carrierB.connect(carrierGainB).connect(this.anomalyGain);
    tremolo.connect(tremoloDepth).connect(carrierGainB.gain);
    carrierA.start();
    carrierB.start();
    tremolo.start();
  }

  private applyMix(): void {
    if (!this.context || !this.masterGain || !this.ambientGain || !this.effectsGain) return;
    const now = this.context.currentTime;
    const master = this.settings.muted ? 0 : this.clamp01(this.settings.masterVolume);
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.ambientGain.gain.setTargetAtTime(this.clamp01(this.settings.ambientVolume), now, 0.08);
    this.effectsGain.gain.setTargetAtTime(this.clamp01(this.settings.effectsVolume), now, 0.04);
  }

  private applyAmbience(): void {
    if (!this.context || !this.windGain || !this.nightGain || !this.anomalyGain) return;
    const now = this.context.currentTime;
    const daylight = this.clamp01(this.worldState.daylight);
    const night = 1 - daylight;
    const anomaly = this.worldState.anomalyInside ? Math.min(1.45, Math.max(0.75, this.worldState.anomalyIntensity)) : 0;

    // Ambient sound should sit behind the world rather than announcing itself. Day/night changes are
    // deliberately gentle, while the anomaly remains the clearly identifiable continuous layer.
    this.windGain.gain.setTargetAtTime(0.022 + daylight * 0.012 + night * 0.004, now, 2.5);
    this.nightGain.gain.setTargetAtTime(night * 0.018, now, 2.8);
    this.anomalyGain.gain.setTargetAtTime(anomaly * 0.1, now, this.worldState.anomalyInside ? 0.7 : 1.2);
  }

  private tone(frequency: number, duration: number, gainAmount: number, type: OscillatorType, delay = 0): void {
    if (!this.context || !this.effectsGain) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount), now + Math.min(0.035, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.effectsGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  }

  private sweep(from: number, to: number, duration: number, gainAmount: number, type: OscillatorType): void {
    if (!this.context || !this.effectsGain) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount), now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.effectsGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  }

  private clamp01(value: number): number {
    return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  }
}
