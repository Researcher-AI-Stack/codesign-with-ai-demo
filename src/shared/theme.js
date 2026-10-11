// Shared light-mode palette. Tailwind only generates classes it can find as
// literal strings, so keep every class name here spelled out in full.

export const ui = {
  page: 'flex-1 bg-slate-50 text-slate-900',
  card: 'bg-white border border-slate-200 rounded-xl shadow-sm',
  cardTitle: 'text-xs font-bold text-slate-500 uppercase tracking-wider',
  muted: 'text-slate-500',
  input: 'w-full min-w-0 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-lg font-mono text-slate-900 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400',
};

export const ACCENTS = {
  beer: '#d97706',
  fastFood: '#DA291C',
  fastFoodSecondary: '#FFC72C',
  semiconductor: '#76B900',
};

export const CHART = {
  grid: '#e2e8f0',
  axis: '#64748b',
  tooltip: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)',
  },
};

// Cents are noise once totals reach six figures, and they overflow narrow cards.
export const formatCurrency = (value) => {
  const digits = Math.abs(value) >= 100000 ? 0 : 2;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

export const stdDev = (values) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
};

// How much more an order series varied than the demand it was responding to.
export const amplification = (orders, demand) => {
  const base = stdDev(demand);
  return base === 0 ? null : stdDev(orders) / base;
};
