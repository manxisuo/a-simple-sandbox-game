import type { RuntimeSettings } from '../settings/RuntimeSettings';

interface SettingsPanelOptions {
  settings: RuntimeSettings;
  onTimeChanged(settings: RuntimeSettings): void;
  onCameraChanged(settings: RuntimeSettings): void;
  onVisualChanged(settings: RuntimeSettings): void;
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
    time: { ...settings.time },
    terrain: { ...settings.terrain },
    camera: { ...settings.camera },
    visual: { ...settings.visual }
  };
}

export function createSettingsPanel(options: SettingsPanelOptions): SettingsPanelController {
  let settings = cloneSettings(options.settings);
  const controls = new Map<string, HTMLInputElement | HTMLSelectElement>();

  const gear = element('button', {
    position: 'fixed', right: '16px', top: '16px', width: '42px', height: '42px', zIndex: '30',
    border: '1px solid rgba(255,255,255,.28)', borderRadius: '12px', background: 'rgba(7,17,30,.62)',
    color: 'white', fontSize: '20px', cursor: 'pointer', backdropFilter: 'blur(8px)'
  });
  gear.textContent = '⚙';
  gear.title = 'Settings';

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
  title.textContent = 'Settings';
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
    input.type = 'checkbox';
    input.checked = value;
    input.addEventListener('change', () => onChange(input.checked));
    controls.set(key, input);
    wrapper.append(input, document.createTextNode(labelText));
    parent.append(wrapper);
  };

  const addRange = (
    parent: HTMLElement,
    key: string,
    labelText: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void
  ): void => {
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
    controls.set(key, input);
    controls.set(`${key}:number`, number);
    line.append(input, number);
    wrapper.append(line);
  };

  const time = section('Time');
  addToggle(time, 'time.cycleEnabled', 'Enable day / night cycle', settings.time.cycleEnabled, value => {
    settings.time.cycleEnabled = value; options.onTimeChanged(settings);
  });
  addToggle(time, 'time.allowNight', 'Allow full night', settings.time.allowNight, value => {
    settings.time.allowNight = value; options.onTimeChanged(settings);
  });
  addRange(time, 'time.cycleSeconds', 'Day length (seconds)', settings.time.cycleSeconds, 30, 1800, 10, value => {
    settings.time.cycleSeconds = value; options.onTimeChanged(settings);
  });
  addRange(time, 'time.timeOfDay', 'Time of day (0–1)', settings.time.timeOfDay, 0, 1, 0.01, value => {
    settings.time.timeOfDay = value; options.onTimeChanged(settings);
  });

  const terrain = section('Terrain');
  const terrainFields: Array<[keyof RuntimeSettings['terrain'], string, number, number, number]> = [
    ['macroScale', 'Macro scale', 0.001, 0.012, 0.0005],
    ['macroAmplitude', 'Macro amplitude', 0, 18, 0.5],
    ['hillScale', 'Hill scale', 0.004, 0.05, 0.001],
    ['hillAmplitude', 'Hill amplitude', 0, 10, 0.25],
    ['detailScale', 'Detail scale', 0.01, 0.12, 0.0025],
    ['detailAmplitude', 'Detail amplitude', 0, 2.5, 0.05],
    ['spawnFlatRadius', 'Spawn flat radius', 0, 30, 1],
    ['spawnBlendRadius', 'Spawn blend radius', 5, 55, 1]
  ];
  for (const [key, labelText, min, max, step] of terrainFields) {
    addRange(terrain, `terrain.${String(key)}`, labelText, settings.terrain[key], min, max, step, value => {
      settings.terrain[key] = value;
    });
  }
  const applyTerrain = element('button', {
    width: '100%', border: '1px solid rgba(255,255,255,.2)', borderRadius: '9px', padding: '9px',
    color: 'white', background: 'rgba(79,137,104,.55)', cursor: 'pointer', fontWeight: '700'
  });
  applyTerrain.textContent = 'Apply & regenerate terrain';
  applyTerrain.addEventListener('click', () => options.onApplyTerrain(settings));
  terrain.append(applyTerrain);

  const camera = section('Camera');
  const modeRow = row(camera, 'View mode');
  const mode = document.createElement('select');
  for (const value of ['first-person', 'third-person'] as const) {
    const option = document.createElement('option'); option.value = value; option.textContent = value === 'first-person' ? 'First person' : 'Third person'; mode.append(option);
  }
  mode.value = settings.camera.mode;
  Object.assign(mode.style, { width: '100%', padding: '7px', borderRadius: '8px', color: 'white', background: '#14263a', border: '1px solid rgba(255,255,255,.18)' });
  mode.addEventListener('change', () => { settings.camera.mode = mode.value as RuntimeSettings['camera']['mode']; options.onCameraChanged(settings); });
  controls.set('camera.mode', mode); modeRow.append(mode);
  addRange(camera, 'camera.thirdPersonDistance', 'Third-person distance', settings.camera.thirdPersonDistance, 2.5, 10, 0.1, value => {
    settings.camera.thirdPersonDistance = value; options.onCameraChanged(settings);
  });
  addRange(camera, 'camera.lookSensitivity', 'Look sensitivity', settings.camera.lookSensitivity, 0.0008, 0.005, 0.0001, value => {
    settings.camera.lookSensitivity = value; options.onCameraChanged(settings);
  });

  const visual = section('Visual');
  addRange(visual, 'visual.viewDistance', 'Chunk view distance', settings.visual.viewDistance, 1, 6, 1, value => {
    settings.visual.viewDistance = Math.round(value); options.onVisualChanged(settings);
  });
  addRange(visual, 'visual.fogFar', 'Fog distance', settings.visual.fogFar, 50, 200, 5, value => {
    settings.visual.fogFar = value; options.onVisualChanged(settings);
  });
  addToggle(visual, 'visual.shadows', 'Shadows', settings.visual.shadows, value => {
    settings.visual.shadows = value; options.onVisualChanged(settings);
  });

  const reset = element('button', {
    width: '100%', border: '1px solid rgba(255,255,255,.2)', borderRadius: '9px', padding: '10px',
    color: 'white', background: 'rgba(255,255,255,.08)', cursor: 'pointer'
  });
  reset.textContent = 'Reset to defaults';
  reset.addEventListener('click', () => {
    settings = cloneSettings(options.onReset());
    refresh(settings);
  });
  drawer.append(reset);
  document.body.append(gear, backdrop, drawer);

  const refresh = (next: RuntimeSettings): void => {
    settings = cloneSettings(next);
    for (const [key, control] of controls) {
      const [baseKey] = key.split(':');
      const [sectionKey, field] = baseKey.split('.') as [keyof RuntimeSettings, string];
      const group = settings[sectionKey] as unknown as Record<string, unknown>;
      const value = group[field];
      if (control instanceof HTMLInputElement && control.type === 'checkbox') control.checked = Boolean(value);
      else control.value = String(value);
    }
  };

  return { refresh };
}
