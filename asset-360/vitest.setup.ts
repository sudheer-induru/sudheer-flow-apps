import '@testing-library/jest-dom/vitest';

// cmdk (Aura Command) and recharts (Aura Chart) rely on layout APIs happy-dom lacks.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub;
}

if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => undefined;
}

// The Aura DataGrid virtualises rows from the scroll container's client size,
// which happy-dom reports as 0, so no rows would render. Give elements a
// desktop-sized box in tests.
Object.defineProperties(HTMLElement.prototype, {
  clientHeight: { configurable: true, get: () => 800 },
  clientWidth: { configurable: true, get: () => 1280 },
});
