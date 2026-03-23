import { useState, useEffect, useCallback } from "react";
import { getInfluencers, getStats, getSettings } from "./api";
import StatsPanel from "./components/StatsPanel";
import ActionButtons from "./components/ActionButtons";
import InfluencerTable from "./components/InfluencerTable";
import SettingsPanel from "./components/SettingsPanel";
import LogsPanel from "./components/LogsPanel";

function App() {
  const [influencers, setInfluencers] = useState([]);
  const [stats, setStats] = useState({});
  const [settings, setSettings] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [logs, setLogs] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

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
    getSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  function handleAction(result) {
    addLog(result);
    loadData();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Influencer Outreach Dashboard</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-sm text-gray-500 hover:text-gray-800 transition"
            >
              {showSettings ? "Hide Settings" : "Settings"}
            </button>
            <button
              onClick={loadData}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <StatsPanel stats={stats} />

        <ActionButtons onAction={handleAction} />

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
        />

        <LogsPanel logs={logs} />
      </main>
    </div>
  );
}

export default App;
