import { useState, useEffect, useCallback } from "react";
import {
  getConnectStatus,
  connectInstagram,
  cancelConnect,
  disconnectInstagram,
} from "../api";

const STATUS_MESSAGES = {
  waiting: "A browser window has opened — log into your Instagram account there.",
  "login-detected": "Login detected! Saving your session...",
  saved: "Instagram connected successfully!",
  timeout: "Login timed out. Please try again.",
  error: "Something went wrong.",
};

export default function InstagramConnect({ onAction }) {
  const [session, setSession] = useState(null);
  const [login, setLogin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await getConnectStatus();
      setSession(data.session);
      setLogin(data.login);
      return data;
    } catch (err) {
      onAction?.({ type: "error", message: err.message });
      return null;
    }
  }, [onAction]);

  // Initial load
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Poll while login is active
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const data = await loadStatus();
      if (data?.login?.active) {
        // Check if completed
        if (["saved", "timeout", "error"].includes(data.login.status)) {
          setPolling(false);
          setLoading(false);
          if (data.login.status === "saved") {
            onAction?.({ type: "success", message: "Instagram connected!" });
          }
        }
      } else {
        // Process ended
        setPolling(false);
        setLoading(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [polling, loadStatus, onAction]);

  async function handleConnect() {
    setLoading(true);
    try {
      const result = await connectInstagram();
      if (result.started) {
        setPolling(true);
        onAction?.({ type: "info", message: result.message });
      } else {
        onAction?.({ type: "error", message: result.message });
        setLoading(false);
      }
    } catch (err) {
      onAction?.({ type: "error", message: err.message });
      setLoading(false);
    }
  }

  async function handleCancel() {
    try {
      await cancelConnect();
      setPolling(false);
      setLoading(false);
      loadStatus();
    } catch (err) {
      onAction?.({ type: "error", message: err.message });
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Instagram? You'll need to re-login to use automation.")) return;
    try {
      const result = await disconnectInstagram();
      onAction?.({ type: "success", message: result.message });
      loadStatus();
    } catch (err) {
      onAction?.({ type: "error", message: err.message });
    }
  }

  const connected = session?.hasSession;
  const isLoggingIn = login?.active && ["waiting", "login-detected"].includes(login?.status);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          connected ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-surface-100"
        }`}>
          <svg className={`w-5 h-5 ${connected ? "text-white" : "text-surface-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-surface-900">Instagram Account</h3>
          <p className="text-xs text-surface-500">
            {connected
              ? `Connected${session?.stale ? " (session may be expired)" : ""}`
              : "Not connected — connect to enable automation"}
          </p>
        </div>
        <div className="flex-shrink-0">
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg ring-1 ring-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            </div>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-surface-500 bg-surface-100 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-surface-400" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Session age warning */}
      {connected && session?.stale && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-xs text-amber-700">
            Session is {session?.sessionAgeDays}+ days old. Re-connect if automation stops working.
          </p>
        </div>
      )}

      {/* Active login status */}
      {isLoggingIn && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-brand-600 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-800">
                {STATUS_MESSAGES[login?.status] || login?.message}
              </p>
              <p className="text-xs text-brand-600 mt-0.5">
                {login?.elapsed}s elapsed
              </p>
            </div>
            <button onClick={handleCancel} className="btn-ghost text-xs text-brand-600 hover:text-brand-800">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Login completed/failed status */}
      {login?.active && login?.status === "saved" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-emerald-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Instagram connected successfully!
          </p>
        </div>
      )}

      {login?.active && ["timeout", "error"].includes(login?.status) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-red-800">{login?.message}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {!connected && !isLoggingIn && (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="btn-primary text-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect Instagram
          </button>
        )}
        {connected && !isLoggingIn && (
          <>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="btn-secondary text-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-connect
            </button>
            <button
              onClick={handleDisconnect}
              className="btn-ghost text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}
