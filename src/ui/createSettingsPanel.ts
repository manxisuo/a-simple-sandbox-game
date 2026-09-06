import { t } from '../i18n';
import type { WeatherType } from '../core/weather/WeatherSystem';
import type { RuntimeSettings } from '../settings/RuntimeSettings';

interface SettingsPanelOptions {
  settings: RuntimeSettings;
  onLanguageChanged(settings: RuntimeSettings): void;
  onTimeChanged(settings: RuntimeSettings): void;
  onWeatherChanged(settings: RuntimeSettings): void;
  onCameraChanged(settings: RuntimeSettings): void;
  onVisualChanged(settings: RuntimeSettings): void;
  onAudioChanged(settings: RuntimeSettings): void;
  onApplyTerrain(settings: RuntimeSettings): void;
  onReset(): RuntimeSettings;
}

export interface SettingsPanelController {
  refresh(settings: RuntimeSettings): void;
}

const font = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, styles: Partial<CSSStyleDeclaration> = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, styles);
  return node;
}

function cloneSettings(settings: RuntimeSettings): RuntimeSettings {
  return {
    language: settings.language,
    time: { ...settings.time },
    weather: { ...settings.weather },
    terrain: { ...settings.terrain },
    camera: { ...settings.camera },
    visual: { ...settings.visual },
    audio: { ...settings.audio }
  };
}

export function createSettingsPanel(options: SettingsPanelOptions): SettingsPanelController {
  let settings = cloneSettings(options.settings);
  const controls = new Map<string, HTMLInputElement | HTMLSelectElement>();
  const tr = <K extends Parameters<typeof t>[1]>(key: K): string => t(settings.language, key);

  const gear = element('button', {
    position: 'fixed', right: '16px', top: '16px', width: '42px', height: '42px', zIndex: '30',
    border: '1px solid rgba(255,255,255,.28)', borderRadius: '12px', background: 'rgba(7,17,30,.62)',
    color: 'white', fontSize: '20px', cursor: 'pointer', backdropFilter: 'blur(8px)'
  });
  gear.textContent = '⚙';
  gear.title = tr('settings.title');

  const backdrop = element('div', {
    position: 'fixed', inset: '0', zIndex: '39', background: 'rgba(0,0,0,.22)', display: 'none'
  });

  const drawer = element('aside', {
    position: 'fixed', top: '0', right: '0', width: 'min(390px, 92vw)', height: '100vh', zIndex: '40',
    boxSizing: 'border-box', padding: '18px 18px 28px', overflowY: 'auto', color: 'white',
    background: 'rgba(10,20,34,.96)', borderLeft: '1px solid rgba(255,255,255,.16)',
    boxShadow: '-16px 0 40px rgba(0,0,0,.28)', fontFamily: font, transform: 'translateX(100%)',
    transition: 'transform 180ms ease'
  });

  const header = element('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' });
  const title = element('div', { fontSize: '20px', fontWeight: '750' });
  title.textContent = tr('settings.title');
  const close = element('button', { border: '0', background: 'transparent', color: 'white', fontSize: '25px', cursor: 'pointer' });
  close.textContent = '×';
  header.append(title, close);
  drawer.append(header);

  const openDrawer = (): void => {
    if (document.pointerLockElement) document.exitPointerLock();
    backdrop.style.display = 'block';
    drawer.style.transform = 'translateX(0)';
  };
  const closeDrawer = (): void => {
    drawer.style.transform = 'translateX(100%)';
    backdrop.style.display = 'none';
  };
  gear.addEventListener('click', openDrawer);
  close.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  const section = (name: string): HTMLDivElement => {
    const box = element('div', { margin: '0 0 18px', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,.055)' });
    const heading = element('div', { fontWeight: '720', fontSize: '14px', marginBottom: '10px' });
    heading.textContent = name;
    box.append(heading);
    drawer.append(box);
    return box;
  };

  const row = (parent: HTMLElement, labelText: string): HTMLDivElement => {
    const wrapper = element('div', { marginBottom: '11px' });
    const label = element('div', { fontSize: '12px', opacity: '.82', marginBottom: '5px' });
    label.textContent = labelText;
    wrapper.append(label);
    parent.append(wrapper);
    return wrapper;
  };

  const addToggle = (parent: HTMLElement, key: string, labelText: string, value: boolean, onChange: (value: boolean) => void): void => {
    const wrapper = element('label', { display: 'flex', gap: '9px', alignItems: 'center', marginBottom: '10px', fontSize: '13px', cursor: 'pointer' });
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = value;
    input.addEventListener('change', () => onChange(input.checked));
    controls.set(key, input);
    wrapper.append(input, document.createTextNode(labelText)); parent.append(wrapper);
  };

  const addRange = (parent: HTMLElement, key: string, labelText: string, value: number, min: number, max: number, step: number, onChange: (value: number) => void): void => {
    const wrapper = row(parent, labelText);
    const line = element('div', { display: 'grid', gridTemplateColumns: '1fr 72px', gap: '8px', alignItems: 'center' });
    const input = document.createElement('input');
    input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(value);
    const number = document.createElement('input');
    number.type = 'number'; number.min = String(min); number.max = String(max); number.step = String(step); number.value = String(value);
    Object.assign(number.style, { width: '100%', boxSizing: 'border-box', borderRadius: '7px', border: '1px solid rgba(255,255,255,.18)', padding: '5px 6px', color: 'white', background: 'rgba(0,0,0,.18)' });
    const apply = (next: number): void => {
      const clamped = Math.min(max, Math.max(min, Number.isFinite(next) ? next : value));
      input.value = String(clamped); number.value = String(clamped); onChange(clamped);
    };
    input.addEventListener('input', () => apply(Number(input.value)));
    number.addEventListener('change', () => apply(Number(number.value)));
    controls.set(key, input); controls.set(`${key}:number`, number);
    line.append(input, number); wrapper.append(line);
  };

  const selectStyle: Partial<CSSStyleDeclaration> = { width: '100%', padding: '7px', borderRadius: '8px', color: 'white', background: '#14263a', border: '1px solid rgba(255,255,255,.18)' };

  const general = section(tr('settings.general'));
  const languageRow = row(general, tr('settings.language'));
  const language = document.createElement('select');
  for (const value of ['zh-CN', 'en'] as const) {
    const option = document.createElement('option');
    option.value = value; option.textContent = value === 'zh-CN' ? tr('settings.language.zh') : tr('settings.language.en'); language.append(option);
  }
  language.value = settings.language; Object.assign(language.style, selectStyle);
  language.addEventListener('change', () => { settings.language = language.value as RuntimeSettings['language']; options.onLanguageChanged(settings); });
  controls.set('language', language); languageRow.append(language);

  const time = section(tr('settings.time'));
  addToggle(time, 'time.cycleEnabled', tr('settings.enableCycle'), settings.time.cycleEnabled, value => { settings.time.cycleEnabled = value; options.onTimeChanged(settings); });
  addToggle(time, 'time.allowNight', tr('settings.allowNight'), settings.time.allowNight, value => { settings.time.allowNight = value; options.onTimeChanged(settings); });
  addRange(time, 'time.cycleSeconds', tr('settings.dayLength'), settings.time.cycleSeconds, 30, 1800, 10, value => { settings.time.cycleSeconds = value; options.onTimeChanged(settings); });
  addRange(time, 'time.timeOfDay', tr('settings.timeOfDay'), settings.time.timeOfDay, 0, 1, 0.01, value => { settings.time.timeOfDay = value; options.onTimeChanged(settings); });

  const weather = section(tr('settings.weather'));
  const weatherRow = row(weather, tr('settings.weatherMode'));
  const weatherSelect = document.createElement('select');
  const weatherOptions: Array<['auto' | WeatherType, Parameters<typeof t>[1]]> = [
    ['auto', 'settings.weatherAuto'],
    ['clear', 'settings.weatherClear'],
    ['drizzle', 'settings.weatherDrizzle'],
    ['rain', 'settings.weatherRain'],
    ['storm', 'settings.weatherStorm'],
    ['mist', 'settings.weatherMist'],
    ['snow', 'settings.weatherSnow']
  ];
  for (const [value, labelKey] of weatherOptions) {
    const option = document.createElement('option'); option.value = value; option.textContent = tr(labelKey); weatherSelect.append(option);
  }
  weatherSelect.value = settings.weather.automatic ? 'auto' : settings.weather.type;
  Object.assign(weatherSelect.style, selectStyle);
  weatherSelect.addEventListener('change', () => {
    const value = weatherSelect.value;
    settings.weather.automatic = value === 'auto';
    if (value !== 'auto') settings.weather.type = value as WeatherType;
    options.onWeatherChanged(settings);
  });
  controls.set('weather.selection', weatherSelect); weatherRow.append(weatherSelect);

  const terrain = section(tr('settings.terrain'));
  const terrainFields: Array<[keyof RuntimeSettings['terrain'], Parameters<typeof t>[1], number, number, number]> = [
    ['macroScale', 'settings.macroScale', 0.001, 0.012, 0.0005], ['macroAmplitude', 'settings.macroAmplitude', 0, 18, 0.5],
    ['hillScale', 'settings.hillScale', 0.004, 0.05, 0.001], ['hillAmplitude', 'settings.hillAmplitude', 0, 10, 0.25],
    ['detailScale', 'settings.detailScale', 0.01, 0.12, 0.0025], ['detailAmplitude', 'settings.detailAmplitude', 0, 2.5, 0.05],
    ['spawnFlatRadius', 'settings.spawnFlatRadius', 0, 30, 1], ['spawnBlendRadius', 'settings.spawnBlendRadius', 5, 55, 1]
  ];
  for (const [key, labelKey, min, max, step] of terrainFields) {
    addRange(terrain, `terrain.${String(key)}`, tr(labelKey), settings.terrain[key], min, max, step, value => { settings.terrain[key] = value; });
  }
  const applyTerrain = element('button', { width: '100%', border: '1px solid rgba(255,255,255,.2)', borderRadius: '9px', padding: '9px', color: 'white', background: 'rgba(79,137,104,.55)', cursor: 'pointer', fontWeight: '700' });
  applyTerrain.textContent = tr('settings.applyTerrain'); applyTerrain.addEventListener('click', () => options.onApplyTerrain(settings)); terrain.append(applyTerrain);

  const camera = section(tr('settings.camera'));
  const modeRow = row(camera, tr('settings.viewMode'));
  const mode = document.createElement('select');
  for (const value of ['first-person', 'third-person'] as const) {
    const option = document.createElement('option'); option.value = value; option.textContent = value === 'first-person' ? tr('settings.firstPerson') : tr('settings.thirdPerson'); mode.append(option);
  }
  mode.value = settings.camera.mode; Object.assign(mode.style, selectStyle);
  mode.addEventListener('change', () => { settings.camera.mode = mode.value as RuntimeSettings['camera']['mode']; options.onCameraChanged(settings); });
  controls.set('camera.mode', mode); modeRow.append(mode);
  addRange(camera, 'camera.thirdPersonDistance', tr('settings.thirdPersonDistance'), settings.camera.thirdPersonDistance, 2.5, 10, 0.1, value => { settings.camera.thirdPersonDistance = value; options.onCameraChanged(settings); });
  addRange(camera, 'camera.lookSensitivity', tr('settings.lookSensitivity'), settings.camera.lookSensitivity, 0.0008, 0.005, 0.0001, value => { settings.camera.lookSensitivity = value; options.onCameraChanged(settings); });

  const visual = section(tr('settings.visual'));
  addRange(visual, 'visual.viewDistance', tr('settings.viewDistance'), settings.visual.viewDistance, 1, 6, 1, value => { settings.visual.viewDistance = Math.round(value); options.onVisualChanged(settings); });
  addRange(visual, 'visual.fogFar', tr('settings.fogDistance'), settings.visual.fogFar, 50, 200, 5, value => { settings.visual.fogFar = value; options.onVisualChanged(settings); });
  addToggle(visual, 'visual.shadows', tr('settings.shadows'), settings.visual.shadows, value => { settings.visual.shadows = value; options.onVisualChanged(settings); });
  addToggle(visual, 'visual.showSun', tr('settings.showSun'), settings.visual.showSun, value => { settings.visual.showSun = value; options.onVisualChanged(settings); });
  addToggle(visual, 'visual.showMoon', tr('settings.showMoon'), settings.visual.showMoon, value => { settings.visual.showMoon = value; options.onVisualChanged(settings); });

  const audio = section(tr('settings.audio'));
  addToggle(audio, 'audio.muted', tr('settings.audioMute'), settings.audio.muted, value => { settings.audio.muted = value; options.onAudioChanged(settings); });
  addRange(audio, 'audio.masterVolume', tr('settings.audioMaster'), settings.audio.masterVolume, 0, 1, 0.05, value => { settings.audio.masterVolume = value; options.onAudioChanged(settings); });
  addRange(audio, 'audio.ambientVolume', tr('settings.audioAmbient'), settings.audio.ambientVolume, 0, 1, 0.05, value => { settings.audio.ambientVolume = value; options.onAudioChanged(settings); });
  addRange(audio, 'audio.effectsVolume', tr('settings.audioEffects'), settings.audio.effectsVolume, 0, 1, 0.05, value => { settings.audio.effectsVolume = value; options.onAudioChanged(settings); });

  const reset = element('button', { width: '100%', border: '1px solid rgba(255,255,255,.2)', borderRadius: '9px', padding: '10px', color: 'white', background: 'rgba(255,255,255,.08)', cursor: 'pointer' });
  reset.textContent = tr('settings.reset');
  reset.addEventListener('click', () => { settings = cloneSettings(options.onReset()); refresh(settings); });
  drawer.append(reset); document.body.append(gear, backdrop, drawer);

  const refresh = (next: RuntimeSettings): void => {
    settings = cloneSettings(next);
    for (const [key, control] of controls) {
      if (key === 'language') { control.value = settings.language; continue; }
      if (key === 'weather.selection') { control.value = settings.weather.automatic ? 'auto' : settings.weather.type; continue; }
      const [baseKey] = key.split(':');
      const [sectionKey, field] = baseKey.split('.') as [keyof RuntimeSettings, string];
      const group = settings[sectionKey] as unknown as Record<string, unknown>;
      const value = group[field];
      if (control instanceof HTMLInputElement && control.type === 'checkbox') control.checked = Boolean(value); else control.value = String(value);
    }
  };

  return { refresh };
}
