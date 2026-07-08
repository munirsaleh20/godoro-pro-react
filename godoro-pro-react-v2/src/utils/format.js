// Format a number as TZS currency, e.g. 230000 -> "TZS 230,000"
export function fmt(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US');
}

export function fmtS(n) {
  return `TZS ${fmt(n)}`;
}

export function today() {
  return new Date().toISOString().split('T')[0];
}
