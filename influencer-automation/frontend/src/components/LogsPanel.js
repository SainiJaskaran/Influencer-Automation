export default function LogsPanel({ logs }) {
  return (
    <div className="bg-gray-900 rounded-lg shadow p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">Activity Log</h2>
      <div className="h-48 overflow-y-auto font-mono text-xs space-y-1">
        {logs.length === 0 && (
          <p className="text-gray-600">No activity yet...</p>
        )}
        {logs.map((log, i) => (
          <div
            key={i}
            className={`${
              log.type === "error"
                ? "text-red-400"
                : log.type === "success"
                ? "text-green-400"
                : "text-gray-300"
            }`}
          >
            <span className="text-gray-500">[{log.time}]</span> {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
