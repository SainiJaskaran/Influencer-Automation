const CARDS = [
  {
    key: "total",
    label: "Total Influencers",
    getValue: (s) => s.total || 0,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    accent: "text-brand-600",
    bg: "bg-brand-50",
    ring: "ring-brand-100",
  },
  {
    key: "contacted",
    label: "Messages Sent",
    getValue: (s) => s.contacted || 0,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    accent: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-100",
  },
  {
    key: "replied",
    label: "Replies Received",
    getValue: (s) => s.replied || 0,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "ring-emerald-100",
  },
  {
    key: "conversion",
    label: "Conversion Rate",
    getValue: (s) => `${s.conversionRate || 0}%`,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    accent: "text-violet-600",
    bg: "bg-violet-50",
    ring: "ring-violet-100",
  },
];

export default function StatsPanel({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => (
        <div key={card.key} className="card p-5 group hover:shadow-card-hover transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="label mb-0">{card.label}</span>
            <div className={`w-9 h-9 rounded-lg ${card.bg} ring-1 ${card.ring} flex items-center justify-center ${card.accent}`}>
              {card.icon}
            </div>
          </div>
          <p className="text-3xl font-bold text-surface-900 tracking-tight">
            {card.getValue(stats)}
          </p>
        </div>
      ))}
    </div>
  );
}
