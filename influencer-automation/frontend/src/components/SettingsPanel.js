import { useState } from "react";
import { updateSettings } from "../api";

const ENGAGEMENT_OPTIONS = [
  { label: "Poor (0 - 1%)", value: 0 },
  { label: "Average (1 - 3%)", value: 1 },
  { label: "Good (3 - 5%)", value: 3 },
  { label: "Great (5 - 8%)", value: 5 },
  { label: "Excellent (8%+)", value: 8 },
];

function engagementValueToKey(val) {
  const num = Number(val);
  if (num >= 8) return 8;
  if (num >= 5) return 5;
  if (num >= 3) return 3;
  if (num >= 1) return 1;
  return 0;
}

export default function SettingsPanel({ settings, onSaved }) {
  const [form, setForm] = useState({
    minFollowers: settings?.filters?.minFollowers || 10000,
    maxFollowers: settings?.filters?.maxFollowers || 200000,
    minEngagement: engagementValueToKey(settings?.filters?.minEngagement || 0),
    minReach: settings?.filters?.minReach || 3000,
    hashtags: (settings?.hashtags || []).join(", "),
  });
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        hashtags: form.hashtags.split(",").map((h) => h.trim()).filter(Boolean),
        filters: {
          minFollowers: Number(form.minFollowers),
          maxFollowers: Number(form.maxFollowers),
          minEngagement: Number(form.minEngagement),
          minReach: Number(form.minReach),
        },
      };
      await updateSettings(payload);
      onSaved("Settings saved successfully");
    } catch (err) {
      onSaved("Error: " + err.message);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Settings</h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min Followers</label>
          <input
            type="number"
            name="minFollowers"
            value={form.minFollowers}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max Followers</label>
          <input
            type="number"
            name="maxFollowers"
            value={form.maxFollowers}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min Engagement</label>
          <select
            name="minEngagement"
            value={form.minEngagement}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 text-sm bg-white"
          >
            {ENGAGEMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min Reach</label>
          <input
            type="number"
            name="minReach"
            value={form.minReach}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hashtags</label>
          <input
            type="text"
            name="hashtags"
            value={form.hashtags}
            onChange={handleChange}
            placeholder="skincare, beauty, makeup"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
