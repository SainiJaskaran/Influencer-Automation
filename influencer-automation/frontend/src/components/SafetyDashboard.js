import { useState, useEffect } from "react";
import { getSafetyDashboard, getActivityLog, updateRateLimits } from "../api";

const ACTION_LABELS = {
  dm_sent: { label: "DMs Sent", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  profile_visited: { label: "Profiles Visited", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  search_performed: { label: "Searches", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  reply_checked: { label: "Reply Checks", icon: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" },
  discovery_run: { label: "Discovery Runs", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
};

function ProgressBar({ current, limit }) {
  const pct = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  const color =
    pct >= 85 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";
  const textColor =
    pct >= 85 ? "text-red-600" : pct >= 60 ? "text-amber-600" : "text-surface-500";

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className={`text-xs font-semibold tabular-nums ${textColor}`}>
          {current}/{limit}
        </span>
        <span className={`text-[10px] font-medium ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full bg-surface-100 rounded-full h-1.5">
        <div
          className={`${color} h-1.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SafetyDashboard({ onAction }) {
  const [dashboard, setDashboard] = useState(null);
  const [activity, setActivity] = useState([]);
  const [editingLimits, setEditingLimits] = useState(false);
  const [limitsForm, setLimitsForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      const [dash, act] = await Promise.all([
        getSafetyDashboard(),
        getActivityLog({ limit: 50 }),
      ]);
      setDashboard(dash);
      setActivity(act);
    } catch (err) {
      onAction({ type: "error", message: `Safety data load failed: ${err.message}` });
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEditLimits() {
    const form = {};
    if (dashboard?.limits) {
      for (const [key, val] of Object.entries(dashboard.limits)) {
        form[`${key}_perHour`] = val.perHour || 0;
        form[`${key}_perDay`] = val.perDay || 0;
      }
    }
    setLimitsForm(form);
    setEditingLimits(true);
  }

  async function saveLimits() {
    setSaving(true);
    const limits = {};
    for (const actionType of Object.keys(ACTION_LABELS)) {
      limits[actionType] = {
        perHour: Number(limitsForm[`${actionType}_perHour`]) || 0,
        perDay: Number(limitsForm[`${actionType}_perDay`]) || 0,
      };
    }
    try {
      await updateRateLimits(limits);
      onAction({ type: "success", message: "Rate limits updated" });
      setEditingLimits(false);
      loadData();
    } catch (err) {
      onAction({ type: "error", message: err.message });
    }
    setSaving(false);
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="w-6 h-6 animate-spin text-surface-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-surface-500">Monitor rate limits and protect your account from detection</p>

      {/* Warning banner */}
      {dashboard.paused && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">Rate limit exceeded</p>
            <p className="text-xs text-red-600 mt-0.5">Automation is auto-paused to protect your account. Wait for limits to reset.</p>
          </div>
        </div>
      )}

      {/* Usage cards */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-surface-900">Rate Limits</h3>
          {!editingLimits ? (
            <button onClick={startEditLimits} className="btn-ghost text-xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Limits
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={saveLimits} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditingLimits(false)} className="btn-secondary text-xs">Cancel</button>
            </div>
          )}
        </div>

        {editingLimits ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(ACTION_LABELS).map(([key, meta]) => (
              <div key={key} className="border border-surface-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                  </svg>
                  <span className="text-sm font-semibold text-surface-700">{meta.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-surface-400 uppercase mb-1">Per Hour</label>
                    <input
                      type="number"
                      value={limitsForm[`${key}_perHour`] || 0}
                      onChange={(e) => setLimitsForm({ ...limitsForm, [`${key}_perHour`]: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-surface-400 uppercase mb-1">Per Day</label>
                    <input
                      type="number"
                      value={limitsForm[`${key}_perDay`] || 0}
                      onChange={(e) => setLimitsForm({ ...limitsForm, [`${key}_perDay`]: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(dashboard.usage || {}).map(([key, data]) => {
              const meta = ACTION_LABELS[key];
              if (!meta) return null;
              return (
                <div key={key} className="bg-surface-50/50 rounded-lg p-4 border border-surface-100">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                    </svg>
                    <span className="text-sm font-semibold text-surface-700">{meta.label}</span>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-[10px] font-medium text-surface-400 uppercase mb-1">Hourly</p>
                      <ProgressBar current={data.currentHourly} limit={data.limitHourly} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-surface-400 uppercase mb-1">Daily</p>
                      <ProgressBar current={data.currentDaily} limit={data.limitDaily} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-surface-700">Recent Activity</h3>
          <span className="badge bg-surface-100 text-surface-500 text-[10px]">{activity.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Time</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Action</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-surface-400 text-sm">No activity recorded yet</td>
                </tr>
              )}
              {activity.map((a, i) => (
                <tr key={i} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                  <td className="px-5 py-2.5 text-xs text-surface-400 font-mono whitespace-nowrap">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="badge bg-surface-100 text-surface-600 text-[11px]">
                      {ACTION_LABELS[a.actionType]?.label || a.actionType}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-xs text-surface-500">
                    {a.influencerUsername && <span className="font-medium text-surface-700">@{a.influencerUsername}</span>}
                    {a.metadata?.hashtag && <span className="text-brand-600 ml-1">#{a.metadata.hashtag}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
