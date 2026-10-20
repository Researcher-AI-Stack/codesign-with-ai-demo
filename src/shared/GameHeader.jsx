import { formatCurrency } from './theme';

const HeaderStat = ({ label, value }) => (
  <div className="sm:text-right">
    <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
    <div className="text-lg md:text-xl font-bold font-mono text-slate-900 leading-tight">{value}</div>
  </div>
);

// Not sticky below md: the app's mobile top bar already occupies top-0.
export default function GameHeader({ title, role, week, maxWeeks, cost, logo, accent }) {
  return (
    <header className="bg-white border-b border-slate-200 border-t-4 md:sticky md:top-0 z-20" style={{ borderTopColor: accent }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-3 min-w-0">
          {logo}
          <div className="min-w-0">
            <h1 className="font-bold text-lg leading-tight truncate">{title}</h1>
            <p className="text-sm text-slate-500 truncate">{role}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <HeaderStat label="Week" value={`${week} / ${maxWeeks}`} />
          <HeaderStat label="Total cost" value={formatCurrency(cost)} />
        </div>
      </div>
    </header>
  );
}
