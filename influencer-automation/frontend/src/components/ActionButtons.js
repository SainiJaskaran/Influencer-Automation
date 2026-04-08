import { useState, useEffect } from "react";
import { startDiscovery, startDM, startReplyCheck, stopProcess, getSessionStatus } from "../api";

const ACTIONS = [
  {
    key: "discovery",
    label: "Discovery",
    action: startDiscovery,
    className: "btn-primary",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    key: "dm",
    label: "Send DMs",
    action: startDM,
    className: "btn-success",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    key: "replies",
    label: "Check Replies",
    action: startReplyCheck,
    className: "btn-secondary",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
  },
];

export default function ActionButtons({ onAction, sessionKey }) {
  const [loading, setLoading] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    getSessionStatus().then(setSession).catch(() => {});
  }, [sessionKey]);

  async function handleAction(key, action, label) {
    setLoading(key);
    try {
      const result = await action();
      onAction({ type: "success", message: result.message || `${label} started` });
    } catch (err) {
      onAction({ type: "error", message: err.message });
    }
    setLoading(null);
  }

  async function handleStop() {
    setLoading("stop");
    try {
      const result = await stopProcess("all");
      onAction({ type: "success", message: result.message || "All processes stopped" });
    } catch (err) {
      onAction({ type: "error", message: err.message });
    }
    setLoading(null);
  }

  const noSession = session && !session.hasSession;
  const staleSession = session && session.hasSession && session.stale;

  return (
    <div className="space-y-3">
      {noSession && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">No Instagram session</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Run <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[11px]">npm run login</code> in the backend directory to connect your Instagram account.
            </p>
          </div>
        </div>
      )}

      {staleSession && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-700">
            Session is {session.sessionAgeDays}+ days old. If automation fails, re-run <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">npm run login</code>.
          </p>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => handleAction(a.key, a.action, a.label)}
                disabled={loading !== null || noSession}
                className={`${a.className} text-xs disabled:opacity-50`}
              >
                {loading === a.key ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  a.icon
                )}
                {a.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleStop}
            disabled={loading !== null}
            className="btn-danger text-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop All
          </button>
        </div>
      </div>
    </div>
  );
}
