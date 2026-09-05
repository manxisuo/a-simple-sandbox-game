import type * as THREE from 'three';
import { t, type Locale } from '../i18n';
import type { UIController } from '../types';

const uiFont = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Partial<CSSStyleDeclaration> = {}
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  Object.assign(element.style, styles);
  return element;
}

export function createUI(renderer: THREE.WebGLRenderer, locale: Locale): UIController {
  const overlay = createElement('div', {
    position: 'fixed', inset: '0', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'white',
    fontFamily: uiFont, fontSize: '34px', fontWeight: '700',
    textShadow: '0 2px 18px rgba(0,0,0,0.45)', background: 'rgba(10,20,34,0.34)',
    cursor: 'pointer', zIndex: '20'
  });
  overlay.innerHTML = `<div>${t(locale, 'ui.clickToExplore')}</div><span>${t(locale, 'ui.controls')}</span>`;

  const hint = overlay.querySelector<HTMLSpanElement>('span');
  if (hint) {
    hint.style.fontSize = '15px';
    hint.style.fontWeight = '500';
  }

  const hud = createElement('div', {
    position: 'fixed', left: '18px', top: '18px', padding: '11px 13px', minWidth: '180px',
    color: 'white', background: 'rgba(7,17,30,0.36)', border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '10px', backdropFilter: 'blur(6px)', fontFamily: uiFont, fontSize: '13px',
    lineHeight: '1.55', textShadow: '0 1px 5px rgba(0,0,0,0.4)', pointerEvents: 'none', zIndex: '9'
  });

  const interaction = createElement('div', {
    position: 'fixed', left: '50%', top: '58%', transform: 'translateX(-50%)',
    padding: '7px 11px', color: 'white', background: 'rgba(7,17,30,0.58)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontFamily: uiFont,
    fontSize: '13px', fontWeight: '650', opacity: '0', transition: 'opacity 120ms ease',
    pointerEvents: 'none', zIndex: '10'
  });

  const message = createElement('div', {
    position: 'fixed', left: '50%', bottom: '92px', transform: 'translateX(-50%) translateY(8px)',
    padding: '8px 12px', color: 'white', background: 'rgba(7,17,30,0.62)', borderRadius: '999px',
    fontFamily: uiFont, fontSize: '13px', opacity: '0', transition: 'opacity 180ms ease, transform 180ms ease',
    pointerEvents: 'none', zIndex: '9'
  });

  const crosshair = createElement('div', {
    position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -52%)',
    color: 'rgba(255,255,255,0.92)', fontFamily: 'monospace', fontSize: '24px', fontWeight: '300',
    textShadow: '0 1px 4px rgba(0,0,0,0.65)', pointerEvents: 'none', zIndex: '8', display: 'none'
  });
  crosshair.textContent = '+';

  const badge = createElement('div', {
    position: 'fixed', right: '16px', bottom: '14px', padding: '7px 10px', color: 'rgba(255,255,255,0.92)',
    background: 'rgba(10,20,34,0.36)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: '8px',
    fontFamily: uiFont, fontSize: '12px', fontWeight: '650', pointerEvents: 'none', zIndex: '9'
  });
  badge.textContent = t(locale, 'ui.badge');

  document.body.append(overlay, hud, interaction, message, crosshair, badge);

  overlay.addEventListener('click', () => renderer.domElement.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    const playing = document.pointerLockElement === renderer.domElement;
    overlay.style.display = playing ? 'none' : 'flex';
    crosshair.style.display = playing ? 'block' : 'none';
    if (!playing) interaction.style.opacity = '0';
  });

  let messageTimer = 0;

  return {
    setHud(html: string): void {
      hud.innerHTML = html;
    },
    setInteractionPrompt(text: string | null): void {
      interaction.textContent = text ?? '';
      interaction.style.opacity = text && document.pointerLockElement === renderer.domElement ? '1' : '0';
    },
    showMessage(text: string, seconds = 2.2): void {
      message.textContent = text;
      messageTimer = seconds;
      message.style.opacity = '1';
      message.style.transform = 'translateX(-50%) translateY(0)';
    },
    update(delta: number): void {
      if (messageTimer <= 0) return;
      messageTimer -= delta;
      if (messageTimer <= 0) {
        message.style.opacity = '0';
        message.style.transform = 'translateX(-50%) translateY(8px)';
      }
    }
  };
}
