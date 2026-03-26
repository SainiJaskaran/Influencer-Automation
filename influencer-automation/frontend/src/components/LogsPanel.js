export default function LogsPanel({ logs }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-2">
        <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h2 className="text-sm font-semibold text-surface-700">Activity Log</h2>
        <span className="badge bg-surface-100 text-surface-500 text-[10px]">{logs.length}</span>
      </div>
      <div className="bg-surface-900 p-4">
        <div className="h-44 overflow-y-auto font-mono text-xs space-y-0.5">
          {logs.length === 0 && (
            <p className="text-surface-600 italic">Waiting for activity...</p>
          )}
          {logs.map((log, i) => (
            <div
              key={i}
              className={`py-0.5 flex items-start gap-2 ${
                log.type === "error"
                  ? "text-red-400"
                  : log.type === "success"
                  ? "text-emerald-400"
                  : "text-surface-400"
              }`}
            >
              <span className="text-surface-600 flex-shrink-0 select-none">{log.time}</span>
              <span
                className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                  log.type === "error"
                    ? "bg-red-400"
                    : log.type === "success"
                    ? "bg-emerald-400"
                    : "bg-surface-600"
                }`}
              />
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
