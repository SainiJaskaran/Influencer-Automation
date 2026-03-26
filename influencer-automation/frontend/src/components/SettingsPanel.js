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
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <h2 className="text-base font-semibold text-surface-900">Discovery Settings</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="label">Min Followers</label>
          <input type="number" name="minFollowers" value={form.minFollowers} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">Max Followers</label>
          <input type="number" name="maxFollowers" value={form.maxFollowers} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">Min Engagement</label>
          <select name="minEngagement" value={form.minEngagement} onChange={handleChange} className="select">
            {ENGAGEMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Min Reach</label>
          <input type="number" name="minReach" value={form.minReach} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">Hashtags</label>
          <input type="text" name="hashtags" value={form.hashtags} onChange={handleChange} placeholder="skincare, beauty" className="input" />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
