export type WeatherType = 'clear' | 'drizzle' | 'rain' | 'storm' | 'mist' | 'snow';

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

const WEATHER_SEQUENCE: WeatherType[] = ['clear', 'drizzle', 'rain', 'storm', 'mist', 'snow'];

export class WeatherSystem {
  private readonly rand: () => number;
  private readonly listeners = new Set<WeatherEventListener>();
  private weather: WeatherType = 'clear';
  private sequenceIndex = 0;
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
    if (time >= this.nextChangeAt) this.advanceWeather(time);

    const targetIntensity = this.weather === 'clear' ? 0
      : this.weather === 'drizzle' ? 0.35
        : this.weather === 'rain' ? 0.7
          : this.weather === 'storm' ? 1
            : this.weather === 'snow' ? 0.62
              : 0.45;
    const targetWind = this.weather === 'storm' ? 0.85
      : this.weather === 'rain' ? 0.45
        : this.weather === 'snow' ? 0.28
          : this.weather === 'mist' ? 0.08
            : 0.18;
    const smoothing = Math.min(1, delta * 0.45);
    this.intensity += (targetIntensity - this.intensity) * smoothing;
    this.wind += (targetWind - this.wind) * smoothing;

    if (this.weather === 'storm' && time >= this.nextThunderAt) {
      this.emit({ type: 'weather.thunder', weather: this.weather, time });
      this.nextThunderAt = time + 6 + this.rand() * 13;
    }
  }

  private advanceWeather(time: number): void {
    this.sequenceIndex = (this.sequenceIndex + 1) % WEATHER_SEQUENCE.length;
    this.weather = WEATHER_SEQUENCE[this.sequenceIndex] ?? 'clear';
    this.emit({ type: 'weather.changed', weather: this.weather, time });

    // V1 deliberately cycles through every weather type so each scene is easy to play-test.
    this.nextChangeAt = time + 38 + this.rand() * 18;
    this.nextThunderAt = this.weather === 'storm' ? time + 3 + this.rand() * 6 : Number.POSITIVE_INFINITY;
  }

  private emit(event: WeatherEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
