export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function sqlNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
