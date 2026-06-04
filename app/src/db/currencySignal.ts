// Pub/sub for GlobalCurrencyBar refresh.
// Debounced 80ms — batches rapid-fire calls (log submit + quest complete + dungeon clear)
// into a single re-read so the bar doesn't flicker or stall the JS thread.

const listeners = new Set<() => void>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function triggerCurrencyRefresh(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    listeners.forEach(fn => fn());
    debounceTimer = null;
  }, 80);
}

export function onCurrencyRefresh(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
