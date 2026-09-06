export type WeatherType = 'clear' | 'drizzle' | 'rain' | 'storm' | 'mist';

export interface WeatherSnapshot {
  type: WeatherType;
  intensity: number;
  wind: number;
}

export interface WeatherEvent {
  type: 'weather.changed' | 'weather.thunder';
  weather: WeatherType;
  time: number;
}

export type WeatherEventListener = (event: WeatherEvent) => void;

export class WeatherSystem {
  private readonly rand: () => number;
  private readonly listeners = new Set<WeatherEventListener>();
  private weather: WeatherType = 'clear';
  private intensity = 0;
  private wind = 0.12;
  private nextChangeAt = 18;
  private nextThunderAt = Number.POSITIVE_INFINITY;

  constructor(rand: () => number) {
    this.rand = rand;
  }

  onEvent(listener: WeatherEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): WeatherSnapshot {
    return { type: this.weather, intensity: this.intensity, wind: this.wind };
  }

  update(time: number, delta: number): void {
    if (time >= this.nextChangeAt) this.chooseNextWeather(time);

    const targetIntensity = this.weather === 'clear' ? 0 : this.weather === 'drizzle' ? 0.35 : this.weather === 'rain' ? 0.7 : this.weather === 'storm' ? 1 : 0.45;
    const targetWind = this.weather === 'storm' ? 0.85 : this.weather === 'rain' ? 0.45 : this.weather === 'mist' ? 0.08 : 0.18;
    const smoothing = Math.min(1, delta * 0.45);
    this.intensity += (targetIntensity - this.intensity) * smoothing;
    this.wind += (targetWind - this.wind) * smoothing;

    if (this.weather === 'storm' && time >= this.nextThunderAt) {
      this.emit({ type: 'weather.thunder', weather: this.weather, time });
      this.nextThunderAt = time + 6 + this.rand() * 13;
    }
  }

  private chooseNextWeather(time: number): void {
    const roll = this.rand();
    const next: WeatherType = roll < 0.34 ? 'clear' : roll < 0.52 ? 'drizzle' : roll < 0.72 ? 'rain' : roll < 0.84 ? 'storm' : 'mist';
    if (next !== this.weather) {
      this.weather = next;
      this.emit({ type: 'weather.changed', weather: next, time });
    }
    this.nextChangeAt = time + 42 + this.rand() * 58;
    this.nextThunderAt = next === 'storm' ? time + 3 + this.rand() * 6 : Number.POSITIVE_INFINITY;
  }

  private emit(event: WeatherEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
