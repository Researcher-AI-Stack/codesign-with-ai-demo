import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RotateCcw, TrendingUp } from 'lucide-react';
import { ui, CHART } from './theme';

// stats: [{ label, value }]
// series: [{ key, name, color, dashed }] plotted against chartData rows keyed by `week`.
export default function EndReport({ title = 'Simulation complete', subtitle, stats, chartTitle, chartData, series, takeaway, onRestart, accent, children }) {
  return (
    <div className="max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`${ui.card} p-4`}>
            <div className={ui.cardTitle}>{s.label}</div>
            <div className="text-xl lg:text-2xl font-bold font-mono text-slate-900 mt-1 break-words">{s.value}</div>
          </div>
        ))}
      </div>

      <div className={`${ui.card} p-4 md:p-6`}>
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5" style={{ color: accent }} aria-hidden="true" /> {chartTitle}
        </h2>
        {takeaway && <p className="text-slate-600 mb-4">{takeaway}</p>}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="week" stroke={CHART.axis} tick={{ fontSize: 12 }} />
              <YAxis stroke={CHART.axis} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={CHART.tooltip} labelFormatter={w => `Week ${w}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} itemSorter={null} />
              {series.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={s.dashed ? 2 : 2.5}
                  strokeDasharray={s.dashed ? '6 4' : undefined}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {children}

      <div className="flex justify-center pb-8">
        <button
          type="button"
          onClick={() => { onRestart(); window.scrollTo(0, 0); }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
          style={{ backgroundColor: accent }}
        >
          <RotateCcw className="w-5 h-5" aria-hidden="true" /> Play again
        </button>
      </div>
    </div>
  );
}
