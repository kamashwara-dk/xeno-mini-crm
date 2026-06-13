const COLOR_MAP = {
  default: 'bg-slate-800 border-slate-700 text-slate-100',
  green:   'bg-emerald-900 border-emerald-700 text-emerald-100',
  red:     'bg-red-900 border-red-700 text-red-100',
  violet:  'bg-violet-900 border-violet-700 text-violet-100',
  blue:    'bg-blue-900 border-blue-700 text-blue-100',
  amber:   'bg-amber-900 border-amber-700 text-amber-100',
};

/**
 * StatCard
 * Props: { label, value, icon, color }
 */
export default function StatCard({ label, value, icon, color = 'default' }) {
  const colorClass = COLOR_MAP[color] || COLOR_MAP.default;

  return (
    <div className={`rounded-xl border p-4 flex flex-col items-center gap-1 ${colorClass}`}>
      <span className="text-2xl">{icon}</span>
      <span className="text-2xl font-bold tabular-nums">{value ?? 0}</span>
      <span className="text-xs uppercase tracking-widest opacity-70">{label}</span>
    </div>
  );
}
