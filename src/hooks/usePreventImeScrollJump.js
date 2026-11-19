import { useEffect } from 'react';

const EDITABLE_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
]);

let scrollLock = { until: 0, y: 0 };
let mountCount = 0;

function isEditableTextElement(el) {
  if (!el || typeof el !== 'object' || el.nodeType !== 1) return false;
  const tag = el.tagName?.toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true') return true;
  if (tag === 'INPUT') {
    const type = (el.getAttribute?.('type') || el.type || 'text').toLowerCase();
    return EDITABLE_INPUT_TYPES.has(type);
  }
  return false;
}

function isOffscreen(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement?.clientHeight || 0;
  return rect.top < 80 || (vh > 0 && rect.bottom > vh);
}

/**
 * Releases any active IME scroll lock so intentional programmatic or user scrolls succeed.
 */
export function unlockImeScrollGuard() {
  scrollLock.until = 0;
}

function restoreLockedScroll() {
  const { until, y } = scrollLock;
  if (performance.now() < until && window.scrollY !== y) {
    window.scrollTo?.({ top: y, behavior: 'instant' });
  }
}

function lockCurrentScroll() {
  scrollLock = { until: performance.now() + 450, y: window.scrollY };
  queueMicrotask(restoreLockedScroll);
}

function handlePointerDown(e) {
  const cw = document.documentElement?.clientWidth || 0;
  const ch = document.documentElement?.clientHeight || 0;
  if ((cw && e.clientX >= cw) || (ch && e.clientY >= ch)) return;

  const activeEl = document.activeElement;
  if (!isEditableTextElement(activeEl)) return;
  if (e.target === activeEl || activeEl.contains?.(e.target)) return;

  const interactive = e.target?.closest?.(
    'button, a, label, [role="button"], input, select, textarea'
  );
  if (interactive || isOffscreen(activeEl)) {
    if (performance.now() < scrollLock.until) {
      queueMicrotask(restoreLockedScroll);
    } else {
      lockCurrentScroll();
    }
  }
}

function handleCompositionEndOrBlur(e) {
  if (!isEditableTextElement(e.target) || !isOffscreen(e.target)) return;
  if (performance.now() >= scrollLock.until) {
    lockCurrentScroll();
  } else {
    queueMicrotask(restoreLockedScroll);
  }
}

function handleUserInput(e) {
  if (e.type === 'keydown' && (e.isComposing || e.key === 'Process')) return;
  unlockImeScrollGuard();
}

function attachListeners() {
  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('mousedown', handlePointerDown, true);
  document.addEventListener('compositionend', handleCompositionEndOrBlur, true);
  document.addEventListener('blur', handleCompositionEndOrBlur, true);
  window.addEventListener('scroll', restoreLockedScroll, { passive: true });
  window.addEventListener('wheel', handleUserInput, { passive: true });
  window.addEventListener('touchmove', handleUserInput, { passive: true });
  window.addEventListener('keydown', handleUserInput, { passive: true });
  window.addEventListener('popstate', unlockImeScrollGuard);
}

function detachListeners() {
  document.removeEventListener('pointerdown', handlePointerDown, true);
  document.removeEventListener('mousedown', handlePointerDown, true);
  document.removeEventListener('compositionend', handleCompositionEndOrBlur, true);
  document.removeEventListener('blur', handleCompositionEndOrBlur, true);
  window.removeEventListener('scroll', restoreLockedScroll);
  window.removeEventListener('wheel', handleUserInput);
  window.removeEventListener('touchmove', handleUserInput);
  window.removeEventListener('keydown', handleUserInput);
  window.removeEventListener('popstate', unlockImeScrollGuard);
}

/**
 * Prevents Chromium from scrolling a focused off-screen text input back into view when
 * an IME composition commits during pointer interaction, which otherwise cancels button clicks.
 */
export function usePreventImeScrollJump() {
  useEffect(() => {
    if (mountCount === 0) {
      attachListeners();
    }
    mountCount += 1;

    return () => {
      mountCount = Math.max(0, mountCount - 1);
      if (mountCount === 0) {
        detachListeners();
        unlockImeScrollGuard();
      }
    };
  }, []);
}
