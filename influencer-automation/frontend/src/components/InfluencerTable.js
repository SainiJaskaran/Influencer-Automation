import { deleteInfluencer, exportCSV } from "../api";
import { useState } from "react";

const STATUS_STYLES = {
  NEW: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/10",
  CONTACTED: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/10",
  REPLIED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10",
  DEAL: "bg-violet-50 text-violet-700 ring-1 ring-violet-600/10",
};

const QUALITY_STYLES = {
  HIGH_FAKE: { class: "text-red-600 bg-red-50", label: "High Fake" },
  LOW_QUALITY: { class: "text-orange-600 bg-orange-50", label: "Low Quality" },
  GOOD: { class: "text-emerald-600 bg-emerald-50", label: "Good" },
  EXCELLENT: { class: "text-teal-700 bg-teal-50", label: "Excellent" },
};

function formatNumber(num) {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

function ScoreRing({ score }) {
  const pct = Math.min(100, score || 0);
  const color =
    pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-red-400";

  return (
    <div className={`relative w-10 h-10 ${color}`}>
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" opacity={0.15} />
        <circle
          cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3"
          strokeDasharray={`${pct * 0.88} 88`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-surface-800">
        {score || 0}
      </span>
    </div>
  );
}

export default function InfluencerTable({ influencers, statusFilter, onFilterChange, onDeleted }) {
  const [deleting, setDeleting] = useState(null);

  async function handleDelete(inf) {
    if (!window.confirm(`Remove @${inf.username} from the list?`)) return;
    setDeleting(inf._id);
    try {
      await deleteInfluencer(inf._id);
      if (onDeleted) onDeleted(inf.username);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
    setDeleting(null);
  }

  const filters = ["ALL", "NEW", "CONTACTED", "REPLIED", "DEAL"];

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-surface-900">Influencers</h2>
          <span className="badge bg-surface-100 text-surface-600">{influencers.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportCSV(statusFilter ? { status: statusFilter } : {})}
            className="btn-ghost text-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-5 py-2.5 bg-surface-50/50 border-b border-surface-100 flex gap-1">
        {filters.map((s) => {
          const isActive = (s === "ALL" && !statusFilter) || statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => onFilterChange(s === "ALL" ? "" : s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? "bg-surface-900 text-white shadow-sm"
                  : "text-surface-500 hover:text-surface-700 hover:bg-surface-100"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-100">
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Username</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Followers</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Engagement</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Reach</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Quality</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Score</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold text-surface-400 uppercase tracking-wider w-20"></th>
            </tr>
          </thead>
          <tbody>
            {influencers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm text-surface-400">No influencers found</p>
                    <p className="text-xs text-surface-300">Run a discovery to get started</p>
                  </div>
                </td>
              </tr>
            )}
            {influencers.map((inf) => {
              const quality = QUALITY_STYLES[inf.fakeStatus];
              return (
                <tr key={inf._id} className="border-b border-surface-50 hover:bg-brand-50/30 transition-colors duration-100 group">
                  <td className="px-5 py-3.5">
                    <a
                      href={inf.instagramUrl || `https://instagram.com/${inf.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-surface-800 hover:text-brand-600 transition-colors"
                    >
                      @{inf.username}
                    </a>
                    {inf.niche && (
                      <p className="text-[11px] text-surface-400 mt-0.5">#{inf.niche}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-semibold text-surface-700">
                      {formatNumber(inf.followersCount || inf.followers)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-surface-700">
                      {inf.engagementRate ? `${inf.engagementRate}%` : "-"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-surface-600">{formatNumber(inf.estimatedReach)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {quality ? (
                      <span className={`badge text-[11px] ${quality.class}`}>
                        {quality.label}
                      </span>
                    ) : (
                      <span className="text-surface-300 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-center">
                      <ScoreRing score={inf.score} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`badge text-[11px] ${STATUS_STYLES[inf.status] || ""}`}>
                      {inf.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleDelete(inf)}
                      disabled={deleting === inf._id}
                      className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-all disabled:opacity-40"
                    >
                      {deleting === inf._id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
