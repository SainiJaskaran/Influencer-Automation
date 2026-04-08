import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  getConversionFunnel,
  getResponseRates,
  getHashtagPerformance,
  getPerformanceOverTime,
  exportCSV,
} from "../api";

const CHART_COLORS = {
  brand: "#4c6ef5",
  amber: "#f59e0b",
  emerald: "#10b981",
  violet: "#8b5cf6",
  red: "#ef4444",
};

const TOOLTIP_STYLE = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
  fontSize: "12px",
  padding: "8px 12px",
};

function ChartCard({ title, children, empty }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-surface-900 mb-4">{title}</h3>
      {empty ? (
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="w-10 h-10 text-surface-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-surface-400">No data yet</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default function ReportsPanel({ onAction }) {
  const [funnel, setFunnel] = useState([]);
  const [responseRates, setResponseRates] = useState([]);
  const [hashtagPerf, setHashtagPerf] = useState([]);
  const [dailyActivity, setDailyActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [f, rr, hp, da] = await Promise.all([
        getConversionFunnel(),
        getResponseRates(),
        getHashtagPerformance(),
        getPerformanceOverTime(),
      ]);
      setFunnel(f.funnel || []);
      setResponseRates(rr || []);
      setHashtagPerf(hp || []);
      setDailyActivity(da || []);
    } catch (err) {
      onAction({ type: "error", message: `Failed to load reports: ${err.message}` });
    }
    setLoading(false);
  }, [onAction]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (loading) {
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-500">Track conversion funnels, response rates, and performance metrics</p>
        <button onClick={() => exportCSV()} className="btn-secondary text-xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export All Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Conversion Funnel */}
        <ChartCard title="Conversion Funnel" empty={funnel.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnel} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="stage" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill={CHART_COLORS.brand} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Response Rates */}
        <ChartCard title="Response Rate Over Time" empty={responseRates.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={responseRates}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="rate" stroke={CHART_COLORS.emerald} strokeWidth={2.5} dot={{ r: 3.5 }} name="Response %" />
              <Line type="monotone" dataKey="contacted" stroke={CHART_COLORS.amber} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Contacted" />
              <Line type="monotone" dataKey="replied" stroke={CHART_COLORS.brand} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Replied" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hashtag Performance */}
        <ChartCard title="Hashtag Performance" empty={hashtagPerf.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hashtagPerf} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hashtag" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="discovered" fill={CHART_COLORS.brand} name="Discovered" radius={[4, 4, 0, 0]} />
              <Bar dataKey="contacted" fill={CHART_COLORS.amber} name="Contacted" radius={[4, 4, 0, 0]} />
              <Bar dataKey="replied" fill={CHART_COLORS.emerald} name="Replied" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Daily Activity */}
        <ChartCard title="Daily Activity" empty={dailyActivity.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyActivity}>
              <defs>
                <linearGradient id="gradBrand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.brand} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.violet} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.violet} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.amber} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
              <Area type="monotone" dataKey="dm_sent" stroke={CHART_COLORS.brand} fill="url(#gradBrand)" strokeWidth={2} name="DMs" />
              <Area type="monotone" dataKey="profile_visited" stroke={CHART_COLORS.violet} fill="url(#gradViolet)" strokeWidth={2} name="Profiles" />
              <Area type="monotone" dataKey="search_performed" stroke={CHART_COLORS.amber} fill="url(#gradAmber)" strokeWidth={2} name="Searches" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Hashtag details table */}
      {hashtagPerf.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-900">Hashtag Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Hashtag</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Discovered</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Contacted</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Replied</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Conversion</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Avg Score</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Avg ER</th>
                </tr>
              </thead>
              <tbody>
                {hashtagPerf.map((h) => (
                  <tr key={h.hashtag} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-surface-800">#{h.hashtag}</td>
                    <td className="px-5 py-3 text-right text-surface-600 tabular-nums">{h.discovered}</td>
                    <td className="px-5 py-3 text-right text-surface-600 tabular-nums">{h.contacted}</td>
                    <td className="px-5 py-3 text-right text-surface-600 tabular-nums">{h.replied}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-semibold tabular-nums ${h.conversionRate >= 20 ? "text-emerald-600" : h.conversionRate >= 10 ? "text-amber-600" : "text-surface-600"}`}>
                        {h.conversionRate}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-surface-600 tabular-nums">{h.avgScore}</td>
                    <td className="px-5 py-3 text-right text-surface-600 tabular-nums">{h.avgEngagement}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
