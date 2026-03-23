import { deleteInfluencer } from "../api";
import { useState } from "react";

const STATUS_COLORS = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  REPLIED: "bg-green-100 text-green-800",
  DEAL: "bg-purple-100 text-purple-800",
};

const FAKE_COLORS = {
  HIGH_FAKE: "text-red-600",
  LOW_QUALITY: "text-orange-500",
  GOOD: "text-green-600",
  EXCELLENT: "text-emerald-600",
};

function formatNumber(num) {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Influencers</h2>
        <div className="flex gap-2">
          {["ALL", "NEW", "CONTACTED", "REPLIED"].map((s) => (
            <button
              key={s}
              onClick={() => onFilterChange(s === "ALL" ? "" : s)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                (s === "ALL" && !statusFilter) || statusFilter === s
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Followers</th>
              <th className="px-4 py-3">Engagement</th>
              <th className="px-4 py-3">Reach</th>
              <th className="px-4 py-3">Quality</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {influencers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No influencers found
                </td>
              </tr>
            )}
            {influencers.map((inf) => (
              <tr key={inf._id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <a
                    href={inf.instagramUrl || `https://instagram.com/${inf.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    @{inf.username}
                  </a>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatNumber(inf.followersCount || inf.followers)}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {inf.engagementRate ? `${inf.engagementRate}%` : "-"}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatNumber(inf.estimatedReach)}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${FAKE_COLORS[inf.fakeStatus] || "text-gray-400"}`}>
                    {inf.fakeStatus || "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold text-gray-800">{inf.score || 0}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[inf.status] || ""}`}>
                    {inf.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleDelete(inf)}
                    disabled={deleting === inf._id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition disabled:opacity-40"
                  >
                    {deleting === inf._id ? "..." : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
