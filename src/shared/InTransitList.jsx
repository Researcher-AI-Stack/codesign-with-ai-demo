import { Truck } from 'lucide-react';
import { ui } from './theme';

// items: [{ arrivalWeek, label, amount, dot }] where dot is a Tailwind bg class.
export default function InTransitList({ title = 'In transit', items, currentWeek, emptyText = 'Nothing in transit.' }) {
  const weeks = [...new Set(items.map(i => i.arrivalWeek))].sort((a, b) => a - b);

  return (
    <div className={`${ui.card} p-4`}>
      <h2 className={`${ui.cardTitle} flex items-center gap-2 mb-3`}>
        <Truck className="w-4 h-4" aria-hidden="true" /> {title}
      </h2>
      {weeks.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-3">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {weeks.map(week => {
            const inWeeks = week - currentWeek;
            return (
              <li key={week}>
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Week {week}
                  <span className="font-normal text-slate-400"> · {inWeeks <= 1 ? 'next week' : `in ${inWeeks} weeks`}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.filter(i => i.arrivalWeek === week).map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-sm">
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} aria-hidden="true"></span>
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-mono font-bold text-slate-900">{item.amount.toLocaleString()}</span>
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
