import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { getInfluencers, getStats, getSettings } from "./api";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import StatsPanel from "./components/StatsPanel";
import ActionButtons from "./components/ActionButtons";
import InfluencerTable from "./components/InfluencerTable";
import SettingsPanel from "./components/SettingsPanel";
import LogsPanel from "./components/LogsPanel";
import CampaignList from "./components/CampaignList";
import SafetyDashboard from "./components/SafetyDashboard";
import ReportsPanel from "./components/ReportsPanel";
import InstagramConnect from "./components/InstagramConnect";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    key: "campaigns",
    label: "Campaigns",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    key: "safety",
    label: "Safety",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    key: "reports",
    label: "Reports",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

function Dashboard() {
  const { user, logout } = useAuth();
  const [influencers, setInfluencers] = useState([]);
  const [stats, setStats] = useState({});
  const [settings, setSettings] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [logs, setLogs] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  const addLog = useCallback((entry) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ ...entry, time }, ...prev].slice(0, 100));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [inf, st] = await Promise.all([
        getInfluencers(statusFilter),
        getStats(),
      ]);
      setInfluencers(inf);
      setStats(st);
    } catch (err) {
      addLog({ type: "error", message: `Failed to load data: ${err.message}` });
    }
  }, [statusFilter, addLog]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const handleAction = useCallback((result) => {
    addLog(result);
    loadData();
    // Refresh session status in ActionButtons when Instagram connects/disconnects
    if (result.message && (result.message.includes("Instagram connected") || result.message.includes("Disconnect"))) {
      setSessionKey((k) => k + 1);
    }
  }, [addLog, loadData]);

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-surface-900 text-white z-30 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-[68px]" : "w-60"
        }`}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-sm tracking-tight truncate">Influencer Hub</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                  isActive
                    ? "bg-white/[0.12] text-white"
                    : "text-surface-400 hover:text-white hover:bg-white/[0.06]"
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r-full" />
                )}
                <span className={`flex-shrink-0 ${isActive ? "text-brand-400" : "text-surface-500 group-hover:text-surface-300"}`}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User info + Collapse */}
        <div className="border-t border-white/[0.08]">
          {/* User section */}
          {!sidebarCollapsed && user && (
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.name || "User"}</div>
                <div className="text-xs text-surface-500 truncate">{user.email}</div>
              </div>
            </div>
          )}

          <div className="px-3 pb-3 flex gap-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-white/[0.06] text-sm transition-all"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>

            {!sidebarCollapsed && (
              <button
                onClick={logout}
                className="px-3 py-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-white/[0.06] text-sm transition-all"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarCollapsed ? "ml-[68px]" : "ml-60"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-xl border-b border-surface-200/80 flex items-center justify-between px-8">
          <div>
            <h1 className="text-lg font-bold text-surface-900 tracking-tight">
              {NAV_ITEMS.find((n) => n.key === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "dashboard" && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`btn-ghost text-xs ${showSettings ? "bg-surface-100" : ""}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            )}
            <button onClick={loadData} className="btn-ghost text-xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="px-8 py-6 max-w-[1400px]">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <InstagramConnect onAction={handleAction} />
              <StatsPanel stats={stats} />
              <ActionButtons onAction={handleAction} sessionKey={sessionKey} />

              {showSettings && settings && (
                <SettingsPanel
                  settings={settings}
                  onSaved={(msg) => {
                    addLog({ type: "success", message: msg });
                    getSettings().then(setSettings).catch(() => {});
                  }}
                />
              )}

              <InfluencerTable
                influencers={influencers}
                statusFilter={statusFilter}
                onFilterChange={(f) => setStatusFilter(f)}
                onDeleted={(username) => {
                  addLog({ type: "success", message: `Removed @${username}` });
                  loadData();
                }}
                onError={(msg) => addLog({ type: "error", message: msg })}
              />

              <LogsPanel logs={logs} />
            </div>
          )}

          {activeTab === "campaigns" && <CampaignList onAction={handleAction} />}
          {activeTab === "safety" && <SafetyDashboard onAction={handleAction} />}
          {activeTab === "reports" && <ReportsPanel onAction={handleAction} />}
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-surface-500">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
