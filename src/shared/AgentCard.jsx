import { Bot, Loader2 } from 'lucide-react';

const TONES = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  bad: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
};

// badges: [{ label, tone }]; dot is a Tailwind bg class identifying the supplier.
export default function AgentCard({ name, dot, badges = [], details = [], reasoning, busy }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true"></span>
          <span className="font-bold text-sm text-slate-800 truncate">{name}</span>
          <Bot className="w-4 h-4 shrink-0 text-slate-400" aria-label="AI agent" />
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {badges.map(b => (
            <span key={b.label} className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${TONES[b.tone] || TONES.neutral}`}>
              {b.label}
            </span>
          ))}
        </div>
      </div>
      {busy ? (
        <p className="flex items-center gap-2 text-sm text-slate-500 py-1">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Deciding...
        </p>
      ) : (
        <>
          {reasoning && (
            <p className="text-sm text-slate-600 italic border-l-2 border-slate-300 pl-2 mb-2">"{reasoning}"</p>
          )}
          {details.length > 0 && (
            <div className="flex flex-wrap justify-between gap-x-3 text-xs font-semibold text-slate-500">
              {details.map(d => <span key={d}>{d}</span>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
