// Lightweight pub/sub for GlobalCurrencyBar refresh.
// Call triggerCurrencyRefresh() whenever health, HP, coins, or soul record changes.

const listeners = new Set<() => void>();

export function triggerCurrencyRefresh(): void {
  listeners.forEach(fn => fn());
}

export function onCurrencyRefresh(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
