import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement PointerEvent, and the pad's long-press is a pointer
// gesture. React dispatches on the event type name, so a MouseEvent carrying
// the right type is enough to exercise the real handlers.
if (typeof window !== 'undefined' && !('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;

    constructor(type: string, params: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'mouse';
    }
  }

  Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill, writable: true });
  Object.defineProperty(globalThis, 'PointerEvent', { value: PointerEventPolyfill, writable: true });
}

afterEach(() => {
  cleanup();
});
