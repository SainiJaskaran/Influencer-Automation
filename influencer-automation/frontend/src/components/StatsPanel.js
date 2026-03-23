export default function StatsPanel({ stats }) {
  const cards = [
    { label: "Total Influencers", value: stats.total || 0, color: "bg-blue-500" },
    { label: "Messages Sent", value: stats.contacted || 0, color: "bg-yellow-500" },
    { label: "Replies", value: stats.replied || 0, color: "bg-green-500" },
    { label: "Conversion Rate", value: `${stats.conversionRate || 0}%`, color: "bg-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className={`${card.color} rounded-lg p-4 text-white shadow`}>
          <p className="text-sm opacity-80">{card.label}</p>
          <p className="text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
