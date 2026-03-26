import { useState } from "react";
import { startDiscovery, startDM, startReplyCheck, stopProcess } from "../api";

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

export default function ActionButtons({ onAction }) {
  const [loading, setLoading] = useState(null);

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

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              onClick={() => handleAction(a.key, a.action, a.label)}
              disabled={loading !== null}
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
  );
}
