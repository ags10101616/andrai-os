/** Deterministic MXN parsing: avoid floating point for monetary input. */
export function parseMxAmountMinor(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const input = raw.trim();
  if (input === '') return 0;
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(input)) return null;
  const [pesos, centavos=''] = input.split('.');
  const amount = Number(pesos) * 100 + Number(centavos.padEnd(2,'0'));
  if (!Number.isSafeInteger(amount) || amount<0 || amount>999999999999) return null;
  return amount;
}
export function formatMxMoneyMinor(minor:number):string {
  if (!Number.isFinite(minor) || minor < 0) return '—';
  return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(minor/100);
}
