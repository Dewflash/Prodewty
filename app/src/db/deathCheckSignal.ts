// Module-level event bus so any screen can trigger the global death check in _layout.tsx
let cb: (() => void) | null = null;
export function registerDeathCheck(fn: () => void): void { cb = fn; }
export function triggerDeathCheck(): void { cb?.(); }
