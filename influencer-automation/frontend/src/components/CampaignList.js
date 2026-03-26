import { useState, useEffect } from "react";
import {
  getCampaigns,
  deleteCampaign,
  startCampaign,
  pauseCampaign,
  runCampaignNow,
} from "../api";
import CampaignForm from "./CampaignForm";

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10",
  paused: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/10",
  completed: "bg-surface-100 text-surface-600 ring-1 ring-surface-200",
};

const SCHEDULE_PRESETS = {
  "0 9 * * *": "Daily at 9:00 AM",
  "0 */6 * * *": "Every 6 hours",
  "0 */12 * * *": "Every 12 hours",
  "0 10 * * 1": "Monday at 10:00 AM",
  "0 9 * * 1-5": "Weekdays at 9:00 AM",
};

function humanSchedule(cron) {
  return SCHEDULE_PRESETS[cron] || cron || "No schedule set";
}

function StatBlock({ value, label, color }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

export default function CampaignList({ onAction }) {
  const [campaigns, setCampaigns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadCampaigns() {
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (err) {
      onAction({ type: "error", message: `Failed to load campaigns: ${err.message}` });
    }
  }

  useEffect(() => {
    loadCampaigns();
    const interval = setInterval(loadCampaigns, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart(campaign) {
    setLoading(campaign._id);
    try {
      const result = await startCampaign(campaign._id);
      onAction({ type: "success", message: result.message });
      loadCampaigns();
    } catch (err) { onAction({ type: "error", message: err.message }); }
    setLoading(false);
  }

  async function handlePause(campaign) {
    setLoading(campaign._id);
    try {
      const result = await pauseCampaign(campaign._id);
      onAction({ type: "success", message: result.message });
      loadCampaigns();
    } catch (err) { onAction({ type: "error", message: err.message }); }
    setLoading(false);
  }

  async function handleRunNow(campaign) {
    setLoading(campaign._id);
    try {
      const result = await runCampaignNow(campaign._id);
      onAction({ type: "success", message: result.message });
      loadCampaigns();
    } catch (err) { onAction({ type: "error", message: err.message }); }
    setLoading(false);
  }

  async function handleDelete(campaign) {
    if (!window.confirm(`Delete campaign "${campaign.name}"?`)) return;
    try {
      await deleteCampaign(campaign._id);
      onAction({ type: "success", message: `Campaign "${campaign.name}" deleted` });
      loadCampaigns();
    } catch (err) { onAction({ type: "error", message: err.message }); }
  }

  function handleFormDone(msg) {
    setShowForm(false);
    setEditingCampaign(null);
    if (msg) onAction({ type: "success", message: msg });
    loadCampaigns();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-surface-500">Manage your outreach campaigns and schedules</p>
        </div>
        <button
          onClick={() => { setEditingCampaign(null); setShowForm(true); }}
          className="btn-primary text-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Campaign
        </button>
      </div>

      {showForm && (
        <CampaignForm
          campaign={editingCampaign}
          onDone={handleFormDone}
          onCancel={() => { setShowForm(false); setEditingCampaign(null); }}
        />
      )}

      {campaigns.length === 0 && !showForm && (
        <div className="card p-12 text-center">
          <svg className="w-12 h-12 text-surface-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-surface-500 font-medium">No campaigns yet</p>
          <p className="text-surface-400 text-sm mt-1">Create your first campaign to automate outreach</p>
        </div>
      )}

      <div className="space-y-4">
        {campaigns.map((c) => (
          <div key={c._id} className="card-hover p-5">
            {/* Header row */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h3 className="text-base font-semibold text-surface-900 truncate">{c.name}</h3>
                  <span className={`badge text-[11px] ${STATUS_STYLES[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-surface-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {humanSchedule(c.schedule)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    {(c.hashtags || []).map((h) => `#${h}`).join(", ") || "None"}
                  </span>
                </div>
                {c.lastRunAt && (
                  <p className="text-xs text-surface-400 mt-1">
                    Last run: {new Date(c.lastRunAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                {c.status === "paused" && (
                  <button onClick={() => handleStart(c)} disabled={loading === c._id} className="btn-success text-xs py-1.5 px-3 disabled:opacity-50">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    Start
                  </button>
                )}
                {c.status === "active" && (
                  <button onClick={() => handlePause(c)} disabled={loading === c._id} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pause
                  </button>
                )}
                <button onClick={() => handleRunNow(c)} disabled={loading === c._id} className="btn-ghost text-xs disabled:opacity-50">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Now
                </button>
                <button onClick={() => { setEditingCampaign(c); setShowForm(true); }} className="btn-ghost text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => handleDelete(c)} className="text-surface-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-surface-100">
              <StatBlock value={c.liveStats?.discovered || 0} label="Discovered" color="text-brand-600" />
              <StatBlock value={c.liveStats?.contacted || 0} label="Contacted" color="text-amber-600" />
              <StatBlock value={c.liveStats?.replied || 0} label="Replied" color="text-emerald-600" />
              <StatBlock value={c.liveStats?.deals || 0} label="Deals" color="text-violet-600" />
            </div>

            {/* Steps tags */}
            <div className="mt-3 flex gap-1.5">
              {(c.automationSteps || []).map((step) => (
                <span key={step} className="badge bg-surface-50 text-surface-500 text-[10px] ring-1 ring-surface-200">
                  {step}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
